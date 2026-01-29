import React, { useState, useCallback, useRef, useEffect } from 'react';
import LotteryScene, { LotterySceneRef } from './components/LotteryScene';
import Controls from './components/Controls';
import { LotteryStatus, WinnerPayload, Employee, Prize } from './types';
import { fetchParticipants, drawWinner, fetchPrizes } from './services/lotteryService';

const App: React.FC = () => {
  const [status, setStatus] = useState<LotteryStatus>(LotteryStatus.IDLE);
  const [winner, setWinner] = useState<WinnerPayload | null>(null);
  const [participants, setParticipants] = useState<Employee[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  
  const sceneRef = useRef<LotterySceneRef>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Poll data
  useEffect(() => {
    const loadPrizes = async () => {
        const data = await fetchPrizes();
        setPrizes(data);
    };
    loadPrizes();

    const poll = async () => {
      if (status === LotteryStatus.IDLE) {
        const pData = await fetchParticipants();
        // Simple optimization to avoid unnecessary re-renders if count is same (deep check ideally)
        setParticipants(prev => (prev.length !== pData.length ? pData : prev));
        
        // Refresh prize counts silently
        const prizeData = await fetchPrizes();
        setPrizes(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(prizeData)) return prizeData;
            return prev;
        });
      }
    };
    
    poll(); 
    const intervalId = setInterval(poll, 5000); 
    return () => clearInterval(intervalId);
  }, [status]);

  useEffect(() => {
    window.updateWinner = (name: string, avatarUrl: string) => {
      handleRemoteStop({ name, avatarUrl });
    };
  }, [status]);

  useEffect(() => {
    if (audioRef.current) {
        if (isMusicPlaying) {
            audioRef.current.play().catch(e => console.log("Audio autoplay blocked", e));
        } else {
            audioRef.current.pause();
        }
    }
  }, [isMusicPlaying]);

  const handleStart = useCallback(() => {
    // Check stock
    const currentPrize = prizes[currentPrizeIndex];
    if (currentPrize && currentPrize.drawn_count >= currentPrize.total_count) {
        alert("该奖项已抽完，请切换奖项！");
        return;
    }

    setStatus(LotteryStatus.ROLLING);
    setWinner(null);
    sceneRef.current?.resetScene();
    if (audioRef.current) {
        audioRef.current.volume = 0.8;
        if (!isMusicPlaying) setIsMusicPlaying(true);
    }
  }, [isMusicPlaying, prizes, currentPrizeIndex]);

  const handleStopClick = useCallback(async () => {
    const currentPrize = prizes[currentPrizeIndex];
    const prizeId = currentPrize ? currentPrize.id : undefined;
    
    // 1. Transition to Shuffling State immediately
    setStatus(LotteryStatus.SHUFFLING);

    try {
        // 2. Fetch winner + enforce minimum wait time for effect
        const minWaitPromise = new Promise(resolve => setTimeout(resolve, 2500));
        const [winnerData] = await Promise.all([
            drawWinner(prizeId),
            minWaitPromise
        ]);

        if (winnerData) {
          triggerReveal(winnerData.name, winnerData.avatar);
          // Optimistic update
          if (currentPrize) {
             const newPrizes = [...prizes];
             newPrizes[currentPrizeIndex].drawn_count += 1;
             setPrizes(newPrizes);
          }
        } else {
          alert("抽奖失败：可能没有符合条件的人员");
          setStatus(LotteryStatus.IDLE);
        }
    } catch (e) {
        console.error(e);
        setStatus(LotteryStatus.IDLE);
    }
  }, [prizes, currentPrizeIndex]);

  const handleRemoteStop = (data: WinnerPayload) => {
    if (status === LotteryStatus.ROLLING) {
      // For remote stop, we can skip shuffling or do a quick one
      setStatus(LotteryStatus.SHUFFLING);
      setTimeout(() => {
          triggerReveal(data.name, data.avatarUrl);
      }, 2000);
    }
  };

  const triggerReveal = (name: string, avatar: string) => {
    setWinner({ name, avatarUrl: avatar });
    setStatus(LotteryStatus.CONVERGING);
    setTimeout(() => {
      setStatus(LotteryStatus.REVEALED);
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 500); 
    }, 1500);
  };

  const handleReset = useCallback(() => {
    setStatus(LotteryStatus.IDLE);
    setWinner(null);
    sceneRef.current?.resetScene();
  }, []);

  const toggleMusic = () => setIsMusicPlaying(!isMusicPlaying);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden">
      <audio 
        ref={audioRef} 
        loop 
        src="https://cdn.pixabay.com/download/audio/2022/03/24/audio_108169994c.mp3?filename=cyberpunk-city-110204.mp3" 
      />

      <div className="absolute top-0 left-0 w-full p-8 z-20 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col">
          <h3 className="text-cyan-600 font-['Noto_Sans_SC'] text-sm tracking-widest mb-1">年度盛典</h3>
          <h1 className="text-white font-['Noto_Sans_SC'] text-3xl font-bold tracking-wider">幸运大抽奖</h1>
        </div>
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${status === LotteryStatus.ROLLING || status === LotteryStatus.SHUFFLING ? 'bg-red-500 animate-ping' : 'bg-cyan-500'}`}></div>
             <span className="text-cyan-600 font-mono text-xs">系统状态: {status}</span>
           </div>
           <span className="text-gray-600 font-mono text-[10px] mt-1">4K 渲染管线已激活</span>
           <span className="text-cyan-300 font-mono text-xs mt-2">已签到: {participants.length} 人</span>
        </div>
      </div>

      <div className={`absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-500 ease-out ${showFlash ? 'opacity-100' : 'opacity-0'}`} />
      <div className="absolute inset-0 pointer-events-none z-10 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
      <div className="absolute inset-0 pointer-events-none z-10 opacity-10" 
           style={{
             backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)',
             backgroundSize: '100px 100px'
           }}>
      </div>

      <LotteryScene 
        ref={sceneRef}
        status={status} 
        winnerAvatar={winner?.avatarUrl} 
        participantCount={participants.length}
        participants={participants}
      />

      <Controls 
        status={status} 
        onStart={handleStart} 
        onStop={handleStopClick}
        onReset={handleReset}
        winnerName={winner?.name}
        winnerAvatar={winner?.avatarUrl} // Pass avatar here
        isMusicPlaying={isMusicPlaying}
        onToggleMusic={toggleMusic}
        onToggleFullscreen={toggleFullscreen}
        prizes={prizes}
        currentPrizeIndex={currentPrizeIndex}
        onChangePrize={setCurrentPrizeIndex}
      />
    </div>
  );
};

export default App;