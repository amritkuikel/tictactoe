import { motion } from 'framer-motion';

type SquareValue = 'X' | 'O' | null;
type BoardProps = {
  xIsNext: boolean;
  squares: SquareValue[];
  onPlay: (nextSquares: SquareValue[]) => void;
  winningSequence: number[] | null;
};
type SquareProps = {
  value: SquareValue;
  onSquareClick: () => void;
  isWinning: boolean;
};

function Square({ value, onSquareClick, isWinning }: SquareProps) {
  const baseStyle = "w-20 h-20 sm:w-28 sm:h-28 border-4 border-indigo-500 text-4xl sm:text-6xl font-bold hover:bg-indigo-50 active:bg-indigo-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded-lg shadow-lg";
  const colorStyle = value === 'X' ? 'text-blue-600' : 'text-red-600';
  const winningStyle = isWinning ? 'bg-yellow-200' : 'bg-white';

  return (
    <motion.button 
      className={`${baseStyle} ${colorStyle} ${winningStyle}`}
      onClick={onSquareClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {value}
    </motion.button>
  );
}

export function Board({ xIsNext, squares, onPlay, winningSequence }: BoardProps) {
  function handleClick(i: number) {
    if (calculateWinner(squares) || squares[i]) {
      return;
    }
    const nextSquares = squares.slice();
    nextSquares[i] = xIsNext ? 'X' : 'O';
    onPlay(nextSquares);
  }

  const winner = calculateWinner(squares);
  let status: string;
  let statusColor: string;

  if (winner) {
    status = `Winner: ${winner.player}`;
    statusColor = 'bg-green-500 text-white';
  } else if (squares.every(square => square !== null)) {
    status = 'Draw!';
    statusColor = 'bg-yellow-500 text-white';
  } else {
    status = `Next player: ${xIsNext ? 'X' : 'O'}`;
    statusColor = 'bg-indigo-500 text-white';
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      <motion.div 
        className={`px-6 py-3 rounded-lg text-xl font-semibold ${statusColor} shadow-md`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {status}
      </motion.div>
      <div className="grid grid-cols-3 gap-4 p-4 bg-indigo-100 rounded-xl shadow-inner">
        {squares.map((value, index) => (
          <Square 
            key={index} 
            value={value} 
            onSquareClick={() => handleClick(index)} 
            isWinning={winningSequence ? winningSequence.includes(index) : false}
          />
        ))}
      </div>
    </div>
  );
}

function calculateWinner(squares: SquareValue[]): { player: SquareValue, sequence: number[] } | null {
  const lines: number[][] = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { player: squares[a], sequence: [a, b, c] };
    }
  }

  return null;
}

