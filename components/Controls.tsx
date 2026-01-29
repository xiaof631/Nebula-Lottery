import React from 'react';
import { LotteryStatus, Prize } from '../types';

interface Props {
  status: LotteryStatus;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  winnerName?: string;
  winnerAvatar?: string; // Add avatar prop
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
  onToggleFullscreen: () => void;
  prizes: Prize[];
  currentPrizeIndex: number;
  onChangePrize: (index: number) => void;
}

const Controls: React.FC<Props> = ({ 
    status, onStart, onStop, onReset, winnerName, winnerAvatar,
    isMusicPlaying, onToggleMusic, onToggleFullscreen,
    prizes, currentPrizeIndex, onChangePrize
}) => {
  const currentPrize = prizes[currentPrizeIndex];
  const isPrizeFinished = currentPrize && currentPrize.drawn_count >= currentPrize.total_count;

  return (
    <>
        {/* Prize Selector (Only visible when Idle or Rolling) */}
        {status !== LotteryStatus.REVEALED && prizes.length > 0 && (
            <div className="absolute bottom-40 left-0 right-0 z-30 flex justify-center items-center pointer-events-auto animate-fadeIn">
                <div className="flex items-center gap-4 bg-black/60 backdrop-blur-md px-8 py-3 rounded-full border border-cyan-500/30">
                    <button 
                        disabled={status !== LotteryStatus.IDLE || currentPrizeIndex === 0}
                        onClick={() => onChangePrize(currentPrizeIndex - 1)}
                        className="text-cyan-500 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed text-2xl"
                    >
                        ◄
                    </button>
                    <div className="text-center min-w-[200px]">
                        <h3 className="text-cyan-400 text-xl font-bold font-['Noto_Sans_SC']">{currentPrize?.name || "幸运奖"}</h3>
                        <p className={`text-sm font-mono mt-1 ${isPrizeFinished ? 'text-red-500' : 'text-gray-400'}`}>
                            已抽取: {currentPrize?.drawn_count} / {currentPrize?.total_count}
                        </p>
                    </div>
                    <button 
                        disabled={status !== LotteryStatus.IDLE || currentPrizeIndex === prizes.length - 1}
                        onClick={() => onChangePrize(currentPrizeIndex + 1)}
                        className="text-cyan-500 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed text-2xl"
                    >
                        ►
                    </button>
                </div>
            </div>
        )}

        {/* Main Center Controls */}
        <div className="absolute bottom-10 left-0 right-0 z-20 flex flex-col items-center justify-center pointer-events-none">
        
        {/* Winner Display */}
        <div className={`transition-all duration-1000 transform flex flex-col items-center ${status === LotteryStatus.REVEALED ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} mb-12 text-center`}>
            {/* Avatar Display - Scaled down to 600px max */}
            {winnerAvatar && (
                <div className="mb-10 relative group">
                    <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                    {/* Adjusted sizes: w-64 -> md:w-[400px] -> lg:w-[600px] */}
                    <div className="relative w-64 h-64 md:w-[400px] md:h-[400px] lg:w-[600px] lg:h-[600px] rounded-full border-[8px] border-cyan-500 overflow-hidden shadow-[0_0_100px_rgba(0,255,255,0.4)] bg-black">
                        <img 
                            src={winnerAvatar} 
                            alt="Winner" 
                            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-[3000ms] ease-out"
                            crossOrigin="anonymous"
                        />
                    </div>
                </div>
            )}
            
            {currentPrize && <h3 className="text-cyan-500 text-3xl tracking-[0.3em] font-['Noto_Sans_SC'] mb-4 font-bold drop-shadow-md">{currentPrize.name}得主</h3>}
            <div className="relative">
                 <h1 className="text-white text-8xl md:text-[150px] leading-tight font-black font-['Noto_Sans_SC'] drop-shadow-[0_0_30px_rgba(0,255,255,0.6)]">
                    {winnerName}
                </h1>
                <div className="absolute -inset-1 bg-cyan-500 blur-3xl opacity-20 -z-10 rounded-full"></div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="pointer-events-auto flex gap-6 mt-4">
            {status === LotteryStatus.IDLE && (
            <button
                onClick={onStart}
                disabled={isPrizeFinished}
                className={`group relative px-12 py-4 bg-transparent overflow-hidden border rounded-none transition-all duration-300 backdrop-blur-sm
                    ${isPrizeFinished ? 'border-gray-700 cursor-not-allowed' : 'border-cyan-500/50 hover:bg-cyan-500/10'}
                `}
            >
                {!isPrizeFinished && <div className="absolute inset-0 w-1 bg-cyan-500 transition-all duration-[250ms] ease-out group-hover:w-full opacity-20"></div>}
                <span className={`relative font-['Noto_Sans_SC'] text-xl tracking-widest font-bold ${isPrizeFinished ? 'text-gray-600' : 'text-cyan-400 group-hover:text-cyan-200'}`}>
                {isPrizeFinished ? '本轮已抽完' : '启动抽奖序列'}
                </span>
            </button>
            )}

            {(status === LotteryStatus.ROLLING || status === LotteryStatus.SHUFFLING) && (
            <button
                onClick={onStop}
                disabled={status === LotteryStatus.SHUFFLING}
                className={`group relative px-12 py-4 bg-transparent overflow-hidden border border-red-500/50 rounded-none transition-all duration-300 backdrop-blur-sm
                    ${status === LotteryStatus.SHUFFLING ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500/10'}
                `}
            >
                <div className="absolute inset-0 w-1 bg-red-500 transition-all duration-[250ms] ease-out group-hover:w-full opacity-20"></div>
                <span className="relative text-red-400 font-['Noto_Sans_SC'] text-xl tracking-widest font-bold group-hover:text-red-200">
                {status === LotteryStatus.SHUFFLING ? '正在抽选...' : '锁定 / 揭晓'}
                </span>
            </button>
            )}

            {status === LotteryStatus.REVEALED && (
            <button
                onClick={onReset}
                className="group relative px-8 py-3 bg-transparent overflow-hidden border border-gray-500/50 rounded-none hover:bg-gray-500/10 transition-all duration-300 backdrop-blur-sm"
            >
                <span className="relative text-gray-400 font-['Noto_Sans_SC'] text-sm tracking-widest group-hover:text-white">
                系统复位
                </span>
            </button>
            )}
        </div>
        </div>

        {/* Side Controls (Music & Fullscreen) */}
        <div className="absolute bottom-10 right-10 z-20 flex gap-4 pointer-events-auto">
            <button 
                onClick={onToggleMusic}
                className={`p-3 border ${isMusicPlaying ? 'border-cyan-500 text-cyan-400' : 'border-gray-700 text-gray-600'} rounded-full hover:bg-cyan-900/30 transition-colors`}
                title="Toggle Music"
            >
                {isMusicPlaying ? "🔊" : "🔇"}
            </button>
            <button 
                onClick={onToggleFullscreen}
                className="p-3 border border-gray-600 text-gray-400 rounded-full hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-900/30 transition-colors"
                title="Fullscreen"
            >
                ⛶
            </button>
        </div>
    </>
  );
};

export default Controls;