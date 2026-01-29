
export const PARTICLE_COUNT = 48000; // Boosted to 48k for HD density
export const PARTICLE_SIZE = 4.8; // Larger size to ensure overlap
export const SPHERE_RADIUS = 600;

// Colors
export const COLOR_PALETTE = {
  background: 0x050505,
  particleBase: 0x00ffff,
  particleHighlight: 0xff00ff,
};

// Image processing
export const IMG_WIDTH = 210; // 210x210 = ~44k pixels
export const IMG_HEIGHT = 210;

// Animation - UPDATED FOR HEAVY PHYSICS
export const ROTATION_SPEED_IDLE = 0.0005; // Extremely slow idle
export const ROTATION_SPEED_ROLLING = 0.004; // Massive engine speed
export const DAMPING_FACTOR = 0.02; // High drag

// API Configuration
// 本地开发时指向 Node.js 后端端口 (3001)
// 生产环境部署时，如果使用 Nginx 反代，请改回 '' (空字符串)
export const API_BASE_URL = 'http://localhost:3001'; 
