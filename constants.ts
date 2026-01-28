export const PARTICLE_COUNT = 18000;
export const PARTICLE_SIZE = 3.5;
export const SPHERE_RADIUS = 600;

// Colors
export const COLOR_PALETTE = {
  background: 0x050505,
  particleBase: 0x00ffff,
  particleHighlight: 0xff00ff,
};

// Image processing
export const IMG_WIDTH = 128; // Resolution for pixel sampling (keep < 150 for performance)
export const IMG_HEIGHT = 128;

// Animation
export const ROTATION_SPEED_IDLE = 0.002;
export const ROTATION_SPEED_ROLLING = 0.15;
export const DAMPING_FACTOR = 0.08; // How fast particles fly to target