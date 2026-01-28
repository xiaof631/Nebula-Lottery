import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { LotteryStatus } from '../types';
import { PARTICLE_COUNT, PARTICLE_SIZE, SPHERE_RADIUS, IMG_WIDTH, IMG_HEIGHT, DAMPING_FACTOR, ROTATION_SPEED_IDLE, ROTATION_SPEED_ROLLING } from '../constants';

interface Props {
  status: LotteryStatus;
  winnerAvatar?: string | null;
  onParticlesReady?: () => void;
}

export interface LotterySceneRef {
  resetScene: () => void;
}

const LotteryScene = forwardRef<LotterySceneRef, Props>(({ status, winnerAvatar, onParticlesReady }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const requestRef = useRef<number>(0);
  
  // Data Refs
  const targetPositionsRef = useRef<Float32Array | null>(null);
  const targetColorsRef = useRef<Float32Array | null>(null);
  const currentPositionsRef = useRef<Float32Array | null>(null);
  
  // State Refs for Animation loop
  const timeRef = useRef<number>(0);
  const rotationGroupRef = useRef<THREE.Group | null>(null);

  useImperativeHandle(ref, () => ({
    resetScene: () => {
      resetToSphere();
    }
  }));

  // --- Initialization ---
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0008);
    sceneRef.current = scene;

    // 2. Setup Camera
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 3000);
    camera.position.z = 1000;
    cameraRef.current = camera;

    // 3. Setup Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance" 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for 4K perf
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Create Particle System
    createParticleSystem();

    // 5. Lights (Environmental)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 6. Handle Resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 7. Start Loop
    animate();

    if (onParticlesReady) onParticlesReady();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Logic: Create Particles ---
  const createParticleSystem = () => {
    if (!sceneRef.current) return;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const initialTargets = new Float32Array(PARTICLE_COUNT * 3);
    const initialTargetColors = new Float32Array(PARTICLE_COUNT * 3);

    const colorObj = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Sphere distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
      const z = SPHERE_RADIUS * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialTargets[i * 3] = x;
      initialTargets[i * 3 + 1] = y;
      initialTargets[i * 3 + 2] = z;

      // Initial Sci-fi Cyan/Blue colors
      const isAlt = Math.random() > 0.8;
      colorObj.setHex(isAlt ? 0xff00cc : 0x00ffff); 
      
      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;

      initialTargetColors[i * 3] = colorObj.r;
      initialTargetColors[i * 3 + 1] = colorObj.g;
      initialTargetColors[i * 3 + 2] = colorObj.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create a circular texture for particles programmatically
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: PARTICLE_SIZE,
      vertexColors: true,
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.9
    });

    const particles = new THREE.Points(geometry, material);
    
    // Group wrapper for rotation
    const group = new THREE.Group();
    group.add(particles);
    sceneRef.current.add(group);
    
    rotationGroupRef.current = group;
    particlesRef.current = particles;
    currentPositionsRef.current = positions;
    targetPositionsRef.current = initialTargets;
    targetColorsRef.current = initialTargetColors;
  };

  // --- Logic: Process Image for Avatar Mode ---
  useEffect(() => {
    if (status === LotteryStatus.CONVERGING && winnerAvatar) {
      processImageToParticles(winnerAvatar);
    }
  }, [status, winnerAvatar]);

  const processImageToParticles = (url: string) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = IMG_WIDTH;
      canvas.height = IMG_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw image
      ctx.drawImage(img, 0, 0, IMG_WIDTH, IMG_HEIGHT);
      const imgData = ctx.getImageData(0, 0, IMG_WIDTH, IMG_HEIGHT);
      const data = imgData.data;

      const validPixels: { x: number, y: number, r: number, g: number, b: number }[] = [];

      // Scan pixels
      for (let y = 0; y < IMG_HEIGHT; y++) {
        for (let x = 0; x < IMG_WIDTH; x++) {
          const index = (y * IMG_WIDTH + x) * 4;
          const r = data[index] / 255;
          const g = data[index + 1] / 255;
          const b = data[index + 2] / 255;
          const alpha = data[index + 3];

          // Threshold to ignore transparent/dark pixels
          if (alpha > 128) {
            validPixels.push({ 
              x: (x - IMG_WIDTH / 2) * 6, // Scale factor 6 for size
              y: -(y - IMG_HEIGHT / 2) * 6, // Invert Y
              r, g, b 
            });
          }
        }
      }

      updateTargetsToImage(validPixels);
    };
    img.src = url;
  };

  const updateTargetsToImage = (pixels: any[]) => {
    if (!targetPositionsRef.current || !targetColorsRef.current) return;

    const count = PARTICLE_COUNT;
    const pixelCount = pixels.length;

    for (let i = 0; i < count; i++) {
      if (i < pixelCount) {
        // Map particle to pixel
        const p = pixels[i];
        targetPositionsRef.current[i * 3] = p.x;
        targetPositionsRef.current[i * 3 + 1] = p.y;
        targetPositionsRef.current[i * 3 + 2] = 0; // Flat image

        targetColorsRef.current[i * 3] = p.r;
        targetColorsRef.current[i * 3 + 1] = p.g;
        targetColorsRef.current[i * 3 + 2] = p.b;
      } else {
        // Extra particles hide in background or float
        // Let's make them form a faint ring behind
        const theta = Math.random() * Math.PI * 2;
        const r = SPHERE_RADIUS * 1.2;
        targetPositionsRef.current[i * 3] = r * Math.cos(theta);
        targetPositionsRef.current[i * 3 + 1] = r * Math.sin(theta);
        targetPositionsRef.current[i * 3 + 2] = -500; // Push back

        // Dim color
        targetColorsRef.current[i * 3] = 0.1;
        targetColorsRef.current[i * 3 + 1] = 0.1;
        targetColorsRef.current[i * 3 + 2] = 0.1;
      }
    }
  };

  const resetToSphere = () => {
    if (!targetPositionsRef.current || !targetColorsRef.current) return;
    const colorObj = new THREE.Color();
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Re-calculate sphere coords
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
      const z = SPHERE_RADIUS * Math.cos(phi);

      targetPositionsRef.current[i * 3] = x;
      targetPositionsRef.current[i * 3 + 1] = y;
      targetPositionsRef.current[i * 3 + 2] = z;

      const isAlt = Math.random() > 0.8;
      colorObj.setHex(isAlt ? 0xff00cc : 0x00ffff);
      
      targetColorsRef.current[i * 3] = colorObj.r;
      targetColorsRef.current[i * 3 + 1] = colorObj.g;
      targetColorsRef.current[i * 3 + 2] = colorObj.b;
    }
  };

  // --- Animation Loop ---
  const animate = () => {
    requestRef.current = requestAnimationFrame(animate);
    timeRef.current += 0.01;

    if (!rotationGroupRef.current || !particlesRef.current || !targetPositionsRef.current || !targetColorsRef.current) return;

    const attributes = particlesRef.current.geometry.attributes;
    const positions = attributes.position.array as Float32Array;
    const colors = attributes.color.array as Float32Array;
    const targets = targetPositionsRef.current;
    const targetCols = targetColorsRef.current;

    // 1. Rotation Logic
    if (status === LotteryStatus.ROLLING) {
        rotationGroupRef.current.rotation.y += ROTATION_SPEED_ROLLING;
        rotationGroupRef.current.rotation.z = Math.sin(timeRef.current) * 0.2; // Wobbly chaotic spin
    } else if (status === LotteryStatus.IDLE) {
        rotationGroupRef.current.rotation.y += ROTATION_SPEED_IDLE;
        // Slowly return Z to 0
        rotationGroupRef.current.rotation.z *= 0.95;
    } else {
        // Converging/Revealed: Stop rotation smoothly
        rotationGroupRef.current.rotation.y *= 0.9;
        rotationGroupRef.current.rotation.z *= 0.9;
        
        // Ensure it stops facing front eventually if needed, or just freeze
        if (Math.abs(rotationGroupRef.current.rotation.y) < 0.001) rotationGroupRef.current.rotation.y = 0;
    }

    // 2. Particle Interpolation Logic (The Morph)
    // We manually lerp every particle towards its target
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        // Position Lerp
        positions[ix] += (targets[ix] - positions[ix]) * DAMPING_FACTOR;
        positions[iy] += (targets[iy] - positions[iy]) * DAMPING_FACTOR;
        positions[iz] += (targets[iz] - positions[iz]) * DAMPING_FACTOR;

        // Color Lerp
        colors[ix] += (targetCols[ix] - colors[ix]) * 0.05;
        colors[iy] += (targetCols[iy] - colors[iy]) * 0.05;
        colors[iz] += (targetCols[iz] - colors[iz]) * 0.05;

        // Jitter Effect when Rolling
        if (status === LotteryStatus.ROLLING) {
            positions[ix] += (Math.random() - 0.5) * 10;
            positions[iy] += (Math.random() - 0.5) * 10;
            positions[iz] += (Math.random() - 0.5) * 10;
        }
    }

    attributes.position.needsUpdate = true;
    attributes.color.needsUpdate = true;

    // 3. Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  return <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none" />;
});

export default LotteryScene;