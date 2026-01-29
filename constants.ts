
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
// 如果前端和后端部署在同一台机器并通过 Nginx 反代，可以直接用空字符串 '' 让请求走相对路径 /api
// 或者填入你服务器的公网 IP:端口，例如 'http://1.2.3.4:3001'
export const API_BASE_URL = ''; 
