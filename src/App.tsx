/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, RefreshCw, Cpu, Copy } from "lucide-react";
import Peer, { DataConnection } from "peerjs";
import { Board as BoardComponent } from "@/components/board";
import { ConnectionModal } from "@/components/connection-modal";
import { Toaster, toast } from "sonner";
import { PlayerNameInput } from "@/components/player-name-input";
import "./App.css";

type SquareValue = "X" | "O" | null;
type WinnerResult = { value: SquareValue; sequence: number[] } | null;

export default function App() {
  const [history, setHistory] = useState<SquareValue[][]>([
    Array(9).fill(null),
  ]);
  const [currentMove, setCurrentMove] = useState<number>(0);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string>("");
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [winningSequence, setWinningSequence] = useState<number[] | null>(null);
  const [playerName, setPlayerName] = useState<string>("");
  const [opponentName, setOpponentName] = useState<string>("");
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [drawOfferPending, setDrawOfferPending] = useState<boolean>(false);
  const [isMultiplayer, setIsMultiplayer] = useState<boolean>(false);

  const xIsNext = currentMove % 2 === 0;
  const currentSquares = history[currentMove];

  const handleReceivedData = useCallback(
    (data: unknown) => {
      if (typeof data === "object" && data !== null) {
        switch ((data as { type: string }).type) {
          case "move": {
            const moveData = data as { squares: SquareValue[] };
            setHistory((prev) => [...prev, moveData.squares]);
            setCurrentMove((prev) => prev + 1);
            break;
          }
          case "playerName": {
            const nameData = data as { name: string };
            setOpponentName(nameData.name);
            break;
          }
          case "newGameRequest": {
            toast("New game request", {
              action: {
                label: "Accept",
                onClick: () => {
                  connection?.send({ type: "newGameAccepted" });
                  startNewGame();
                },
              },
            });
            break;
          }
          case "newGameAccepted": {
            toast.success("Opponent accepted the new game request");
            startNewGame();
            break;
          }
          case "drawOffer": {
            toast("Draw offer", {
              action: {
                label: "Accept",
                onClick: () => {
                  connection?.send({ type: "drawAccepted" });
                  handleGameEnd("draw");
                },
              },
            });
            break;
          }
          case "drawAccepted": {
            toast.success("Opponent accepted the draw offer");
            handleGameEnd("draw");
            break;
          }
          case "resignation": {
            handleGameEnd("opponent resigned");
            break;
          }
        }
      }
    },
    [
      connection,
      setHistory,
      setCurrentMove,
      setOpponentName,
      startNewGame,
      handleGameEnd,
    ]
  );

  useEffect(() => {
    if (isMultiplayer && !peer) {
      const newPeer = new Peer();
      newPeer.on("open", (id) => {
        setPeerId(id);
        setShowModal(true);
      });
      newPeer.on("connection", (conn) => {
        setConnection(conn);
        conn.on("data", handleReceivedData);
      });
      setPeer(newPeer);
    } else if (!isMultiplayer && peer) {
      peer.destroy();
      setPeer(null);
      setConnection(null);
      setPeerId("");
    }
  }, [isMultiplayer, peer, handleReceivedData]);

  const handlePlay = useCallback(
    (nextSquares: SquareValue[]) => {
      const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
      setHistory(nextHistory);
      setCurrentMove(nextHistory.length - 1);

      const winner = calculateWinner(nextSquares);
      if (winner) {
        setWinningSequence(winner.sequence);
        setGameEnded(true);
        handleGameEnd(isMultiplayer ? "you win" : `${winner.value} wins`);
      } else if (nextSquares.every((square) => square !== null)) {
        setGameEnded(true);
        handleGameEnd("draw");
      }

      if (isMultiplayer && connection) {
        connection.send({ type: "move", squares: nextSquares });
      }
    },
    [history, currentMove, isMultiplayer, connection, handleGameEnd]
  );

  const connectToPeer = (remotePeerId: string) => {
    if (peer) {
      const conn = peer.connect(remotePeerId);
      conn.on("open", () => {
        setConnection(conn);
        conn.send({ type: "playerName", name: playerName });
        conn.on("data", handleReceivedData);
        setShowModal(false);
      });
    }
  };

  useEffect(() => {
    if (
      !isMultiplayer &&
      !xIsNext &&
      !calculateWinner(currentSquares) &&
      currentSquares.some((square) => square === null)
    ) {
      const timer = setTimeout(() => {
        const aiMove = getAIMove(currentSquares);
        if (aiMove !== -1) {
          const nextSquares = currentSquares.slice();
          nextSquares[aiMove] = "O";
          handlePlay(nextSquares);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentSquares, xIsNext, isMultiplayer, handlePlay]);

  function jumpTo(nextMove: number) {
    setCurrentMove(nextMove);
  }

  function startNewGame() {
    setHistory([Array(9).fill(null)]);
    setCurrentMove(0);
    setWinningSequence(null);
    setGameEnded(false);
    setDrawOfferPending(false);
  }

  function toggleMultiplayer() {
    setIsMultiplayer(!isMultiplayer);
    startNewGame();
  }

  function handleGameEnd(result: string) {
    setGameEnded(true);
    toast.success(`Game over: ${result}`);
  }

  function offerDraw() {
    if (connection) {
      connection.send({ type: "drawOffer" });
      setDrawOfferPending(true);
      toast("Draw offer sent");
    }
  }

  function resign() {
    if (connection) {
      connection.send({ type: "resignation" });
      handleGameEnd("you resigned");
    }
  }

  function requestNewGame() {
    if (connection) {
      connection.send({ type: "newGameRequest" });
      toast("New game request sent");
    } else {
      startNewGame();
    }
  }

  const moves = history.map((_, move) => {
    let description: string;
    let buttonStyle: string;

    if (move > 0) {
      description = `Go to move #${move}`;
      buttonStyle = "bg-indigo-100 hover:bg-indigo-200";
    } else {
      description = "Go to game start";
      buttonStyle = "bg-blue-100 hover:bg-blue-200";
    }

    return (
      <motion.li
        key={move}
        className="mb-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: move * 0.1 }}
      >
        <button
          onClick={() => jumpTo(move)}
          className={`w-full p-2 rounded-md transition-all duration-200 
          text-indigo-800 font-medium text-left 
          ${buttonStyle} shadow-sm hover:shadow-md`}
        >
          {description}
        </button>
      </motion.li>
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div
        className="absolute inset-0 bg-grid-indigo-100/50 bg-fixed pointer-events-none"
        aria-hidden="true"
      ></div>
      {!playerName ? (
        <PlayerNameInput onSubmit={setPlayerName} />
      ) : (
        <div className="bg-white bg-opacity-90 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-5xl flex flex-col gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-indigo-800 mb-4 sm:mb-0">
              Tic-Tac-Toe
            </h1>
            <div className="flex space-x-4">
              <motion.button
                className={`px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300 ${
                  !gameEnded && isMultiplayer
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                onClick={requestNewGame}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!gameEnded && isMultiplayer}
              >
                <RefreshCw className="inline-block mr-2" size={20} />
                Start New Game
              </motion.button>
              <motion.button
                className={`px-4 py-2 ${
                  isMultiplayer
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-gray-500 hover:bg-gray-600"
                } text-white rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300`}
                onClick={toggleMultiplayer}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isMultiplayer}
              >
                {isMultiplayer ? (
                  <Users className="inline-block mr-2" size={20} />
                ) : (
                  <Cpu className="inline-block mr-2" size={20} />
                )}
                {isMultiplayer ? "Multiplayer On" : "vs AI"}
              </motion.button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-grow">
              <AnimatePresence>
                <motion.div
                  key={isMultiplayer ? "multiplayer" : "singleplayer"}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-blue-100 p-4 rounded-lg shadow-md mb-4"
                >
                  <h2 className="text-xl font-semibold text-blue-800 mb-2">
                    Players
                  </h2>
                  <div className="flex justify-between">
                    <span className="text-blue-700">{playerName} (X)</span>
                    <span className="text-blue-700">
                      {isMultiplayer ? opponentName || "Opponent" : "AI"} (O)
                    </span>
                  </div>
                  {isMultiplayer && peerId && (
                    <div className="mt-2 flex items-center">
                      <span className="text-sm text-blue-600 mr-2">
                        Your ID: {peerId}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(peerId)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              <BoardComponent
                xIsNext={xIsNext}
                squares={currentSquares}
                onPlay={handlePlay}
                winningSequence={winningSequence}
              />
              {isMultiplayer && (
                <div className="flex justify-center mt-4 space-x-4">
                  <motion.button
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    onClick={offerDraw}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={gameEnded || drawOfferPending}
                  >
                    Offer Draw
                  </motion.button>
                  <motion.button
                    className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                    onClick={resign}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={gameEnded}
                  >
                    Resign
                  </motion.button>
                </div>
              )}
            </div>
            <div className="w-full sm:w-64 bg-indigo-50 rounded-lg p-4 overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-indigo-100">
              <h2 className="text-xl font-bold mb-4 text-indigo-700">
                Game History
              </h2>
              <ol className="space-y-2">{moves}</ol>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <ConnectionModal
          peerId={peerId}
          onConnect={connectToPeer}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function calculateWinner(squares: SquareValue[]): WinnerResult {
  const lines: number[][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { value: squares[a], sequence: [a, b, c] };
    }
  }

  return null;
}

function getAIMove(squares: SquareValue[]): number {
  for (let i = 0; i < squares.length; i++) {
    if (!squares[i]) {
      const testSquares = squares.slice();
      testSquares[i] = "O";
      if (calculateWinner(testSquares)) {
        return i;
      }
    }
  }
  for (let i = 0; i < squares.length; i++) {
    if (!squares[i]) {
      const testSquares = squares.slice();
      testSquares[i] = "X";
      if (calculateWinner(testSquares)) {
        return i;
      }
    }
  }

  if (!squares[4]) {
    return 4;
  }

  const corners = [0, 2, 6, 8];
  const availableCorners = corners.filter((i) => !squares[i]);
  if (availableCorners.length > 0) {
    return availableCorners[
      Math.floor(Math.random() * availableCorners.length)
    ];
  }

  const sides = [1, 3, 5, 7];
  const availableSides = sides.filter((i) => !squares[i]);
  if (availableSides.length > 0) {
    return availableSides[Math.floor(Math.random() * availableSides.length)];
  }

  return -1;
}
