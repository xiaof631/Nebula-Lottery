import { Employee } from '../types';

const NAMES = [
  'Alice Chen', 'Bob Smith', 'Charlie Kim', 'David Lou', 'Eva Mendez', 
  'Frank Wright', 'Grace Hopper', 'Hank Pym', 'Ivy Doom', 'Jack Ryan',
  'Liam Neeson', 'Mia Wallace', 'Noah Sola', 'Olivia Pope', 'Peter Parker'
];

export const generateMockEmployees = (count: number): Employee[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `emp-${i}`,
    name: NAMES[i % NAMES.length] + ` ${Math.floor(Math.random() * 1000)}`,
    avatar: `https://picsum.photos/200?random=${i}`,
    department: 'Engineering'
  }));
};

export const getRandomWinner = (): Employee => {
  const seed = Math.floor(Math.random() * 1000);
  return {
    id: `winner-${seed}`,
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    avatar: `https://picsum.photos/400?grayscale&random=${Date.now()}`,
    department: 'Tech Ops'
  };
};