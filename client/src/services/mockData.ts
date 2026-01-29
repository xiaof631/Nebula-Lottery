import { Employee } from '../types';

// 扩展了名字库，避免重复
const NAMES = [
  '李明', '王芳', '张伟', '刘洋', '陈静', 
  '杨杰', '赵敏', '黄涛', '周薇', '吴刚',
  '郑强', '孙丽', '朱晓', '何峰', '罗琳',
  'Alex', 'Sarah', 'Mike', 'Emma', 'David',
  '林志玲', '吴彦祖', '贾斯汀', '泰勒'
];

// 使用 Unsplash 的高质量人像图片，支持 CORS，适合粒子化效果
const MOCK_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', // Male glasses
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', // Female smiling
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', // Male beard
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', // Male intense
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', // Female side
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', // Male white shirt
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', // Female neutral
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80', // Male smile
];

export const generateMockEmployees = (count: number): Employee[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `emp-${i}`,
    name: NAMES[i % NAMES.length] + ` ${Math.floor(Math.random() * 1000)}`,
    // 循环使用高清头像
    avatar: MOCK_AVATARS[i % MOCK_AVATARS.length],
    department: '技术部'
  }));
};

export const getRandomWinner = (): Employee => {
  const seed = Math.floor(Math.random() * 1000);
  // 随机从高清头像库中选一个
  const randomAvatarIndex = Math.floor(Math.random() * MOCK_AVATARS.length);
  
  return {
    id: `winner-${seed}`,
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    avatar: MOCK_AVATARS[randomAvatarIndex],
    department: '产品中心'
  };
};
