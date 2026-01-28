export enum LotteryStatus {
  IDLE = 'IDLE',
  ROLLING = 'ROLLING',
  CONVERGING = 'CONVERGING',
  REVEALED = 'REVEALED',
}

export interface Employee {
  id: string;
  name: string;
  avatar: string;
  department?: string;
}

export interface ParticleState {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
}

export interface WinnerPayload {
  name: string;
  avatarUrl: string;
}

// Global declaration for external API
declare global {
  interface Window {
    updateWinner: (name: string, avatarUrl: string) => void;
  }
}