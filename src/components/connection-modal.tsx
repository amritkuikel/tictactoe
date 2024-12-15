import { useState } from 'react';
import { motion } from 'framer-motion';

type ConnectionModalProps = {
  peerId: string;
  onConnect: (remotePeerId: string) => void;
  onClose: () => void;
};

export function ConnectionModal({ peerId, onConnect, onClose }: ConnectionModalProps) {
  const [remotePeerId, setRemotePeerId] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-2xl font-bold mb-4">Connect to Peer</h2>
        <p className="mb-4">Your Peer ID: <span className="font-mono">{peerId}</span></p>
        <input
          type="text"
          value={remotePeerId}
          onChange={(e) => setRemotePeerId(e.target.value)}
          placeholder="Enter remote Peer ID"
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => onConnect(remotePeerId)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Connect
          </button>
        </div>
      </div>
    </motion.div>
  );
}

