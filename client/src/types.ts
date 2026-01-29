export enum LotteryStatus {
  IDLE = 'IDLE',
  ROLLING = 'ROLLING',
  SHUFFLING = 'SHUFFLING', // New state for rapid random avatar switching
  CONVERGING = 'CONVERGING',
  REVEALED = 'REVEALED',
}

export interface Employee {
  id: string;
  name: string;
  avatar: string;
  department?: string;
  is_winner?: number;
}

export interface Prize {
  id: number;
  name: string;
  description: string;
  total_count: number;
  drawn_count: number;
  priority: number;
}

export interface BarrageMessage {
  id: number;
  user_id: string;
  name: string;
  content: string;
  created_at: number;
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