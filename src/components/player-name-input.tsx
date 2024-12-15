import React, { useState } from 'react';
import { motion } from 'framer-motion';

type PlayerNameInputProps = {
  onSubmit: (name: string) => void;
};

export function PlayerNameInput({ onSubmit }: PlayerNameInputProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-lg shadow-md"
    >
      <h2 className="text-2xl font-bold mb-4 text-indigo-800">Enter Your Name</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full p-2 mb-4 border border-gray-300 rounded"
        required
      />
      <button
        type="submit"
        className="w-full p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
      >
        Start Game
      </button>
    </motion.form>
  );
}

