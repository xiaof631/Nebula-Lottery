import React from 'react';
import { LotteryStatus } from '../types';

interface Props {
  status: LotteryStatus;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  winnerName?: string;
}

const Controls: React.FC<Props> = ({ status, onStart, onStop, onReset, winnerName }) => {
  return (
    <div className="absolute bottom-10 left-0 right-0 z-20 flex flex-col items-center justify-center pointer-events-none">
      
      {/* Winner Display */}
      <div className={`transition-all duration-1000 transform ${status === LotteryStatus.REVEALED ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} mb-8 text-center`}>
        <h2 className="text-cyan-400 text-2xl tracking-[0.5em] font-light uppercase mb-2 animate-pulse">Winner</h2>
        <h1 className="text-white text-7xl md:text-9xl font-black font-['Orbitron'] drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]">
          {winnerName}
        </h1>
      </div>

      {/* Button Group */}
      <div className="pointer-events-auto flex gap-6">
        {status === LotteryStatus.IDLE && (
          <button
            onClick={onStart}
            className="group relative px-12 py-4 bg-transparent overflow-hidden border border-cyan-500/50 rounded-none hover:bg-cyan-500/10 transition-all duration-300 backdrop-blur-sm"
          >
            <div className="absolute inset-0 w-1 bg-cyan-500 transition-all duration-[250ms] ease-out group-hover:w-full opacity-20"></div>
            <span className="relative text-cyan-400 font-['Orbitron'] text-xl tracking-widest font-bold group-hover:text-cyan-200">
              START SEQUENCE
            </span>
          </button>
        )}

        {status === LotteryStatus.ROLLING && (
          <button
            onClick={onStop}
            className="group relative px-12 py-4 bg-transparent overflow-hidden border border-red-500/50 rounded-none hover:bg-red-500/10 transition-all duration-300 backdrop-blur-sm"
          >
            <div className="absolute inset-0 w-1 bg-red-500 transition-all duration-[250ms] ease-out group-hover:w-full opacity-20"></div>
            <span className="relative text-red-400 font-['Orbitron'] text-xl tracking-widest font-bold group-hover:text-red-200">
              STOP & REVEAL
            </span>
          </button>
        )}

        {status === LotteryStatus.REVEALED && (
          <button
            onClick={onReset}
            className="group relative px-8 py-3 bg-transparent overflow-hidden border border-gray-500/50 rounded-none hover:bg-gray-500/10 transition-all duration-300 backdrop-blur-sm"
          >
             <span className="relative text-gray-400 font-['Orbitron'] text-sm tracking-widest group-hover:text-white">
              RESET SYSTEM
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Controls;