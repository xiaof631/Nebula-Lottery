import React, { useState, useCallback, useRef, useEffect } from 'react';
import LotteryScene, { LotterySceneRef } from './components/LotteryScene';
import Controls from './components/Controls';
import { LotteryStatus, WinnerPayload } from './types';
import { getRandomWinner } from './services/mockData';

const App: React.FC = () => {
  const [status, setStatus] = useState<LotteryStatus>(LotteryStatus.IDLE);
  const [winner, setWinner] = useState<WinnerPayload | null>(null);
  const sceneRef = useRef<LotterySceneRef>(null);

  // 1. Expose function for WebSocket/API trigger
  useEffect(() => {
    window.updateWinner = (name: string, avatarUrl: string) => {
      handleRemoteStop({ name, avatarUrl });
    };
    return () => {
      // Cleanup if necessary
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleStart = useCallback(() => {
    setStatus(LotteryStatus.ROLLING);
    setWinner(null);
    sceneRef.current?.resetScene();
  }, []);

  const handleStopClick = useCallback(() => {
    // In a real app, this might trigger a request to backend to "draw" a winner
    // Here we simulate getting data locally
    const mockWinner = getRandomWinner();
    triggerReveal(mockWinner.name, mockWinner.avatar);
  }, []);

  const handleRemoteStop = (data: WinnerPayload) => {
    if (status === LotteryStatus.ROLLING) {
      triggerReveal(data.name, data.avatarUrl);
    }
  };

  const triggerReveal = (name: string, avatar: string) => {
    setWinner({ name, avatarUrl: avatar });
    setStatus(LotteryStatus.CONVERGING);

    // Give visual time for particles to form before showing text fully
    setTimeout(() => {
      setStatus(LotteryStatus.REVEALED);
    }, 1500);
  };

  const handleReset = useCallback(() => {
    setStatus(LotteryStatus.IDLE);
    setWinner(null);
    sceneRef.current?.resetScene();
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 w-full p-8 z-20 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col">
          <h3 className="text-cyan-600 font-['Orbitron'] text-sm tracking-widest mb-1">ANNUAL CEREMONY</h3>
          <h1 className="text-white font-['Orbitron'] text-3xl font-bold tracking-wider">LUCKY DRAW</h1>
        </div>
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${status === LotteryStatus.ROLLING ? 'bg-red-500 animate-ping' : 'bg-cyan-500'}`}></div>
             <span className="text-cyan-600 font-mono text-xs">SYSTEM STATUS: {status}</span>
           </div>
           <span className="text-gray-600 font-mono text-[10px] mt-1">4K RENDER PIPELINE ACTIVE</span>
        </div>
      </div>

      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
      <div className="absolute inset-0 pointer-events-none z-10 opacity-10" 
           style={{
             backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)',
             backgroundSize: '100px 100px'
           }}>
      </div>

      {/* 3D Scene */}
      <LotteryScene 
        ref={sceneRef}
        status={status} 
        winnerAvatar={winner?.avatarUrl} 
      />

      {/* UI Controls */}
      <Controls 
        status={status} 
        onStart={handleStart} 
        onStop={handleStopClick}
        onReset={handleReset}
        winnerName={winner?.name}
      />
    </div>
  );
};

export default App;