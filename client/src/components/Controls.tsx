import React, { useState, useEffect } from 'react';
import { LotteryStatus, Prize } from '../types';

interface Props {
  status: LotteryStatus;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  winnerName?: string;
  winnerAvatar?: string;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
  onToggleFullscreen: () => void;
  prizes: Prize[];
  currentPrizeIndex: number;
  onChangePrize: (index: number) => void;
  onUpdatePrizeCount?: (id: number, count: number) => void;
}

const Controls: React.FC<Props> = ({ 
    status, onStart, onStop, onReset, winnerName, winnerAvatar,
    isMusicPlaying, onToggleMusic, onToggleFullscreen,
    prizes, currentPrizeIndex, onChangePrize, onUpdatePrizeCount
}) => {
  const currentPrize = prizes[currentPrizeIndex];
  const isPrizeFinished = currentPrize && currentPrize.drawn_count >= currentPrize.total_count;

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(0);

  useEffect(() => {
      if (currentPrize) {
          setEditValue(currentPrize.total_count);
      }
  }, [currentPrize]);

  const handleSave = () => {
      if (currentPrize && onUpdatePrizeCount) {
          const newCount = Math.max(editValue, currentPrize.drawn_count);
          onUpdatePrizeCount(currentPrize.id, newCount);
          setIsEditing(false);
      }
  };

  return (
    <>
        {/* Prize Selector (Only visible when Idle or Rolling) */}
        {status !== LotteryStatus.REVEALED && prizes.length > 0 && (
            <div className="absolute bottom-40 left-0 right-0 z-30 flex justify-center items-center pointer-events-auto">
                <div className="flex items-center gap-4 bg-black/80 backdrop-blur-md px-8 py-4 rounded-full border border-cyan-500/50 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                    <button 
                        disabled={status !== LotteryStatus.IDLE || currentPrizeIndex === 0 || isEditing}
                        onClick={() => onChangePrize(currentPrizeIndex - 1)}
                        className="text-cyan-500 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed text-3xl transition-colors"
                    >
                        ◄
                    </button>
                    <div className="text-center min-w-[240px]">
                        <h3 className="text-cyan-400 text-2xl font-bold font-['Noto_Sans_SC'] tracking-wider">{currentPrize?.name || "幸运奖"}</h3>
                        
                        <div className="flex items-center justify-center gap-3 mt-2">
                            <span className={`text-base font-mono ${isPrizeFinished ? 'text-red-500' : 'text-gray-400'}`}>
                                已抽: {currentPrize?.drawn_count} /
                            </span>
                            
                            {isEditing ? (
                                <input 
                                    type="number" 
                                    value={editValue}
                                    onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                                    onBlur={handleSave}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    autoFocus
                                    className="w-20 bg-gray-900 border-2 border-cyan-500 text-cyan-400 text-center text-lg font-bold rounded focus:outline-none px-1"
                                />
                            ) : (
                                <span className={`text-xl font-bold font-mono ${isPrizeFinished ? 'text-red-500' : 'text-white'}`}>
                                    {currentPrize?.total_count}
                                </span>
                            )}

                            {/* Edit Icon Button - High Contrast */}
                            {status === LotteryStatus.IDLE && (
                                <button 
                                    onClick={() => {
                                        if (isEditing) {
                                            handleSave();
                                        } else {
                                            setIsEditing(true);
                                        }
                                    }}
                                    className={`ml-2 p-1 rounded-full transition-all duration-200 ${isEditing ? 'text-green-400 bg-green-900/30' : 'text-cyan-600 hover:text-cyan-300 hover:bg-cyan-900/30'}`}
                                    title={isEditing ? "保存" : "修改数量"}
                                >
                                    {isEditing ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                    <button 
                        disabled={status !== LotteryStatus.IDLE || currentPrizeIndex === prizes.length - 1 || isEditing}
                        onClick={() => onChangePrize(currentPrizeIndex + 1)}
                        className="text-cyan-500 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed text-3xl transition-colors"
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
                disabled={isPrizeFinished || isEditing}
                className={`group relative px-12 py-4 bg-transparent overflow-hidden border rounded-none transition-all duration-300 backdrop-blur-sm
                    ${isPrizeFinished || isEditing ? 'border-gray-700 cursor-not-allowed' : 'border-cyan-500/50 hover:bg-cyan-500/10'}
                `}
            >
                {!isPrizeFinished && !isEditing && <div className="absolute inset-0 w-1 bg-cyan-500 transition-all duration-[250ms] ease-out group-hover:w-full opacity-20"></div>}
                <span className={`relative font-['Noto_Sans_SC'] text-xl tracking-widest font-bold ${isPrizeFinished || isEditing ? 'text-gray-600' : 'text-cyan-400 group-hover:text-cyan-200'}`}>
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