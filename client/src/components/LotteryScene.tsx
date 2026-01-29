import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { LotteryStatus, BarrageMessage, Employee } from '../types';
import { PARTICLE_COUNT, PARTICLE_SIZE, SPHERE_RADIUS, IMG_WIDTH, IMG_HEIGHT, API_BASE_URL } from '../constants';
import { fetchMessages } from '../services/lotteryService';

interface Props {
  status: LotteryStatus;
  winnerAvatar?: string | null;
  participantCount?: number;
  participants?: Employee[]; 
  onParticlesReady?: () => void;
}

export interface LotterySceneRef {
  resetScene: () => void;
}

// 弹性缓动函数
function elasticOut(t: number) {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const p = 0.4; // 调整周期，让弹性更明显
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

// 指数缓动 - 爆发用
function expoIn(t: number) {
    return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
}

const LotteryScene = forwardRef<LotterySceneRef, Props>(({ status, winnerAvatar, participantCount = 0, participants = [], onParticlesReady }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const requestRef = useRef<number>(0);
  
  // Groups
  const rotationGroupRef = useRef<THREE.Group | null>(null);
  const barrageGroupRef = useRef<THREE.Group>(new THREE.Group());
  const avatarCloudGroupRef = useRef<THREE.Group>(new THREE.Group());
  const shuffleGroupRef = useRef<THREE.Group>(new THREE.Group()); 

  // Data Refs (Animation Loop Safe)
  const statusRef = useRef(status);
  const winnerAvatarRef = useRef(winnerAvatar);
  const participantsRef = useRef(participants);
  
  const seenMessageIdsRef = useRef<Set<number>>(new Set());
  const targetPositionsRef = useRef<Float32Array | null>(null);
  const targetColorsRef = useRef<Float32Array | null>(null);
  const targetSizesRef = useRef<Float32Array | null>(null);
  
  // State Tracking
  const timeRef = useRef<number>(0);
  const stateStartTimeRef = useRef<number>(0); 
  const originalPositionsRef = useRef<Float32Array | null>(null);
  
  // Shuffle Logic Refs
  const shuffleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const shuffleTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastShuffleTimeRef = useRef<number>(0);
  const tempImageRef = useRef<HTMLImageElement>(new Image());

  const prevCountRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    resetScene: () => {
      resetToSphere();
    }
  }));

  // Sync Props to Refs for Animation Loop
  useEffect(() => {
    // Only update start time if status actually changed
    if (statusRef.current !== status) {
        stateStartTimeRef.current = Date.now();
        statusRef.current = status;
    }
  }, [status]);

  useEffect(() => {
      winnerAvatarRef.current = winnerAvatar;
  }, [winnerAvatar]);

  useEffect(() => {
      participantsRef.current = participants;
      // Also update cloud when participants change
      if (avatarCloudGroupRef.current) {
         updateAvatarCloud(participants);
      }
  }, [participants]);


  // --- Initialization ---
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.0003); 
    sceneRef.current = scene;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 8000); // Increased far plane for explosion
    camera.position.z = 900; 
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance" 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    createParticleSystem();
    createShuffleCard(); 

    scene.add(barrageGroupRef.current);
    scene.add(shuffleGroupRef.current); 
    shuffleGroupRef.current.visible = false; 
    
    if (rotationGroupRef.current) {
        rotationGroupRef.current.add(avatarCloudGroupRef.current);
    } else {
        scene.add(avatarCloudGroupRef.current);
    }

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    tempImageRef.current.crossOrigin = "Anonymous";

    animate();

    if (onParticlesReady) onParticlesReady();

    const msgInterval = setInterval(pollMessages, 4000);

    return () => {
      clearInterval(msgInterval);
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, []);

  // --- Shuffle Card Setup ---
  const createShuffleCard = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 600; 
      shuffleCanvasRef.current = canvas;
      
      const texture = new THREE.CanvasTexture(canvas);
      shuffleTextureRef.current = texture;

      // Card Mesh
      const geometry = new THREE.PlaneGeometry(500, 580);
      const material = new THREE.MeshBasicMaterial({ 
          map: texture, 
          transparent: true,
          side: THREE.DoubleSide,
          depthTest: false, // Ensure it's always visible
      });
      const card = new THREE.Mesh(geometry, material);
      card.renderOrder = 999; // Force render on top of particles
      
      shuffleGroupRef.current.add(card);
  };

  const updateShuffleVisual = () => {
      if (!shuffleCanvasRef.current || !shuffleTextureRef.current || participantsRef.current.length === 0) return;
      
      const now = Date.now();
      if (now - lastShuffleTimeRef.current < 50) return;
      lastShuffleTimeRef.current = now;

      const list = participantsRef.current;
      const randomIdx = Math.floor(Math.random() * list.length);
      const user = list[randomIdx];
      
      let srcUrl = user.avatar;
      if (srcUrl.startsWith('http') && API_BASE_URL.startsWith('http') && !API_BASE_URL.includes('your-subdomain')) {
          srcUrl = `${API_BASE_URL}/api/proxy-image?url=${encodeURIComponent(srcUrl)}`;
      }

      const img = tempImageRef.current;
      
      const draw = () => {
          const ctx = shuffleCanvasRef.current!.getContext('2d');
          if (!ctx) return;
          const w = 512;
          const h = 600;

          ctx.clearRect(0,0,w,h);

          // 1. Cyberpunk Frame
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
          ctx.lineWidth = 6;
          
          // Corner brackets
          const len = 40;
          ctx.beginPath();
          ctx.moveTo(0, len); ctx.lineTo(0, 0); ctx.lineTo(len, 0);
          ctx.moveTo(w-len, 0); ctx.lineTo(w, 0); ctx.lineTo(w, len);
          ctx.moveTo(0, h-len); ctx.lineTo(0, h); ctx.lineTo(len, h);
          ctx.moveTo(w-len, h); ctx.lineTo(w, h); ctx.lineTo(w, h-len);
          ctx.stroke();

          // Background box
          ctx.fillStyle = 'rgba(0, 10, 20, 0.9)';
          ctx.fillRect(10, 10, w-20, h-20);

          // 2. Avatar
          const avatarSize = 300;
          const ax = (w - avatarSize)/2;
          const ay = 60;
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(w/2, ay + avatarSize/2, avatarSize/2, 0, Math.PI*2);
          ctx.clip();
          ctx.drawImage(img, ax, ay, avatarSize, avatarSize);
          ctx.restore();

          // Avatar Border
          ctx.beginPath();
          ctx.arc(w/2, ay + avatarSize/2, avatarSize/2 + 5, 0, Math.PI*2);
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 4;
          ctx.stroke();

          // 3. Text Info
          ctx.textAlign = 'center';
          
          ctx.fillStyle = '#00ffff';
          ctx.font = '24px "Orbitron"';
          ctx.fillText(`ID: ${user.id.toUpperCase().slice(0,8)}`, w/2, ay - 20);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 70px "Noto Sans SC"';
          ctx.fillText(user.name, w/2, h - 140);

          ctx.fillStyle = '#aaaaaa';
          ctx.font = '30px "Noto Sans SC"';
          ctx.fillText(user.department || 'Nebula Corp', w/2, h - 90);

          // Scanning Line
          ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
          const scanY = (now % 800) / 800 * h;
          ctx.fillRect(0, scanY, w, 15);

          // Bottom Status
          ctx.fillStyle = '#002222';
          ctx.fillRect(20, h-50, w-40, 30);
          ctx.fillStyle = '#00ff00';
          ctx.font = '20px "Orbitron"';
          ctx.fillText("TARGET ACQUIRING >>>", w/2, h-28);

          shuffleTextureRef.current!.needsUpdate = true;
      };

      if (img.src === srcUrl && img.complete) {
          draw();
      } else {
          img.onload = draw;
          img.src = srcUrl;
      }
  };

  // --- Avatar Cloud Logic ---
  const updateAvatarCloud = (users: Employee[]) => {
      if (!avatarCloudGroupRef.current) return;
      
      const MAX_AVATARS = 50;
      const displayUsers = users.slice(0, MAX_AVATARS);

      // Simple reuse check
      if (avatarCloudGroupRef.current.children.length > 0 && Math.random() > 0.1) return;

      while(avatarCloudGroupRef.current.children.length > 0){ 
          const child = avatarCloudGroupRef.current.children[0];
          avatarCloudGroupRef.current.remove(child);
          if ((child as any).material) (child as any).material.dispose();
      }

      displayUsers.forEach((user) => {
          const sprite = createAvatarSprite(user.avatar);
          if (sprite) avatarCloudGroupRef.current.add(sprite);
      });
  };

  const createAvatarSprite = (url: string) => {
    const r = SPHERE_RADIUS * 0.7 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending 
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    const scale = 40 + Math.random() * 30;
    sprite.scale.set(scale, scale, 1);

    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    ctx.stroke();
    texture.needsUpdate = true;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    let srcUrl = url;
    if (url.startsWith('http') && API_BASE_URL.startsWith('http') && !API_BASE_URL.includes('your-subdomain')) {
        srcUrl = `${API_BASE_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
    }

    img.onload = () => {
        ctx.clearRect(0,0,128,128);
        ctx.save();
        ctx.beginPath();
        ctx.arc(64, 64, 60, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0, 128, 128);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(64, 64, 60, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 6;
        ctx.stroke();
        texture.needsUpdate = true;
    };
    img.src = srcUrl;

    (sprite as any).userData = {
        basePos: new THREE.Vector3(x, y, z),
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5
    };
    return sprite;
  };

  // --- Barrage Logic ---
  const pollMessages = async () => {
    if (statusRef.current !== LotteryStatus.IDLE) return;
    const msgs = await fetchMessages();
    msgs.forEach(msg => {
      if (!seenMessageIdsRef.current.has(msg.id)) {
        seenMessageIdsRef.current.add(msg.id);
        createBarrageSprite(msg);
      }
    });
    if (seenMessageIdsRef.current.size > 500) {
        seenMessageIdsRef.current.clear();
        msgs.forEach(m => seenMessageIdsRef.current.add(m.id));
    }
  };

  const createBarrageSprite = (msg: BarrageMessage) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 32;
    const padding = 10;
    if (!ctx) return;
    
    ctx.font = `bold ${fontSize}px "Noto Sans SC"`;
    const textMetrics = ctx.measureText(msg.content);
    const textWidth = textMetrics.width;
    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;
    
    ctx.font = `bold ${fontSize}px "Noto Sans SC"`;
    ctx.fillStyle = "rgba(0, 255, 255, 0.9)";
    ctx.shadowColor = "rgba(0, 255, 255, 0.8)";
    ctx.shadowBlur = 8;
    ctx.textBaseline = 'middle';
    ctx.fillText(msg.content, padding, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(material);
    const radius = SPHERE_RADIUS * (1.1 + Math.random() * 0.4);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    
    sprite.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi));
    const scale = 0.8;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
    
    (sprite as any).userData = {
        orbitSpeed: 0.002 + Math.random() * 0.005,
        orbitAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
        initialPos: sprite.position.clone()
    };
    barrageGroupRef.current.add(sprite);
    setTimeout(() => {
        if (barrageGroupRef.current) barrageGroupRef.current.remove(sprite);
        material.dispose();
        texture.dispose();
    }, 20000);
  };

  // --- Logic: Create Particles ---
  const createParticleSystem = () => {
    if (!sceneRef.current) return;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    const initialTargets = new Float32Array(PARTICLE_COUNT * 3);
    const initialTargetColors = new Float32Array(PARTICLE_COUNT * 3);
    const initialTargetSizes = new Float32Array(PARTICLE_COUNT);
    const colorObj = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
      const z = SPHERE_RADIUS * Math.cos(phi);

      positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
      initialTargets[i * 3] = x; initialTargets[i * 3 + 1] = y; initialTargets[i * 3 + 2] = z;

      const isAlt = Math.random() > 0.7;
      colorObj.setHex(isAlt ? 0x00aaff : 0xff00ff); 
      
      colors[i * 3] = colorObj.r; colors[i * 3 + 1] = colorObj.g; colors[i * 3 + 2] = colorObj.b;
      initialTargetColors[i * 3] = colorObj.r; initialTargetColors[i * 3 + 1] = colorObj.g; initialTargetColors[i * 3 + 2] = colorObj.b;

      sizes[i] = PARTICLE_SIZE * (0.8 + Math.random() * 1.0);
      initialTargetSizes[i] = sizes[i];
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
      context.beginPath(); context.arc(16, 16, 14, 0, Math.PI * 2); context.fillStyle = '#FFFFFF'; context.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: PARTICLE_SIZE, vertexColors: true, map: texture,
      blending: THREE.NormalBlending, depthWrite: false, transparent: true, opacity: 1.0, sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    const group = new THREE.Group();
    group.add(particles);
    sceneRef.current.add(group);
    
    rotationGroupRef.current = group;
    particlesRef.current = particles;
    targetPositionsRef.current = initialTargets;
    targetColorsRef.current = initialTargetColors;
    targetSizesRef.current = initialTargetSizes;
    originalPositionsRef.current = Float32Array.from(initialTargets);
  };

  const processImageToParticles = (url: string) => {
    let srcUrl = url;
    if (url.startsWith('http') && API_BASE_URL.startsWith('http') && !API_BASE_URL.includes('your-subdomain')) {
        srcUrl = `${API_BASE_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = IMG_WIDTH; canvas.height = IMG_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      try {
        const aspect = img.width / img.height;
        let drawW = IMG_WIDTH; let drawH = IMG_HEIGHT; let offsetX = 0; let offsetY = 0;
        if (aspect > 1) { 
            drawW = IMG_HEIGHT * aspect; offsetX = -(drawW - IMG_WIDTH) / 2;
        } else {
            drawH = IMG_WIDTH / aspect; offsetY = -(drawH - IMG_HEIGHT) / 2;
        }
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, IMG_WIDTH, IMG_HEIGHT);
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        const imgData = ctx.getImageData(0, 0, IMG_WIDTH, IMG_HEIGHT);
        const data = imgData.data;
        const validPixels: { x: number, y: number, r: number, g: number, b: number }[] = [];
        for (let y = 0; y < IMG_HEIGHT; y++) {
          for (let x = 0; x < IMG_WIDTH; x++) {
            const index = (y * IMG_WIDTH + x) * 4;
            let r = data[index] / 255; let g = data[index + 1] / 255; let b = data[index + 2] / 255;
            let brightness = (r + g + b) / 3;
            if (brightness < 0.05) continue; 
            const minVisibleBrightness = 0.2;
            if (brightness < minVisibleBrightness) {
                const lift = 0.15; r += lift; g += lift; b += lift;
            } else {
                r = Math.pow(r, 0.9) * 1.1; g = Math.pow(g, 0.9) * 1.1; b = Math.pow(b, 0.9) * 1.1;
            }
            r = Math.min(1, r); g = Math.min(1, g); b = Math.min(1, b);
            validPixels.push({ x: (x - IMG_WIDTH / 2) * 3.8, y: -(y - IMG_HEIGHT / 2) * 3.8, r, g, b });
          }
        }
        for (let i = validPixels.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validPixels[i], validPixels[j]] = [validPixels[j], validPixels[i]];
        }
        updateTargetsToImage(validPixels);
      } catch (e) { console.error("Failed to read image data", e); }
    };
    img.src = srcUrl;
  };

  const updateTargetsToImage = (pixels: any[]) => {
    if (!targetPositionsRef.current || !targetColorsRef.current || !targetSizesRef.current) return;
    const count = PARTICLE_COUNT; const pixelCount = pixels.length;
    for (let i = 0; i < count; i++) {
      if (i < pixelCount) {
        const p = pixels[i];
        targetPositionsRef.current[i * 3] = p.x; targetPositionsRef.current[i * 3 + 1] = p.y; targetPositionsRef.current[i * 3 + 2] = 0; 
        targetColorsRef.current[i * 3] = p.r; targetColorsRef.current[i * 3 + 1] = p.g; targetColorsRef.current[i * 3 + 2] = p.b;
        targetSizesRef.current[i] = PARTICLE_SIZE * 1.2; 
      } else {
        targetPositionsRef.current[i * 3] = (Math.random()-0.5) * 10000;
        targetPositionsRef.current[i * 3 + 1] = (Math.random()-0.5) * 10000;
        targetPositionsRef.current[i * 3 + 2] = -9999;
        targetColorsRef.current[i * 3] = 0; targetColorsRef.current[i * 3 + 1] = 0; targetColorsRef.current[i * 3 + 2] = 0;
        targetSizesRef.current[i] = 0;
      }
    }
  };

  const resetToSphere = () => {
    if (!targetPositionsRef.current || !targetColorsRef.current || !targetSizesRef.current || !originalPositionsRef.current) return;
    const colorObj = new THREE.Color();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      targetPositionsRef.current[i * 3] = originalPositionsRef.current[i * 3];
      targetPositionsRef.current[i * 3 + 1] = originalPositionsRef.current[i * 3 + 1];
      targetPositionsRef.current[i * 3 + 2] = originalPositionsRef.current[i * 3 + 2];
      const isAlt = Math.random() > 0.7;
      colorObj.setHex(isAlt ? 0x00aaff : 0xff00ff);
      targetColorsRef.current[i * 3] = colorObj.r; targetColorsRef.current[i * 3 + 1] = colorObj.g; targetColorsRef.current[i * 3 + 2] = colorObj.b;
      targetSizesRef.current[i] = PARTICLE_SIZE * (0.8 + Math.random() * 1.0);
    }
  };

  // --- Main Animation Loop ---
  const animate = () => {
    requestRef.current = requestAnimationFrame(animate);
    timeRef.current += 0.015;

    // Use Refs to get fresh state inside closure
    const currentStatus = statusRef.current;
    
    // Logic for Visibility
    if (barrageGroupRef.current && avatarCloudGroupRef.current && shuffleGroupRef.current) {
        const isShuffling = currentStatus === LotteryStatus.SHUFFLING;
        const isConverged = currentStatus === LotteryStatus.CONVERGING || currentStatus === LotteryStatus.REVEALED;
        
        shuffleGroupRef.current.visible = isShuffling;
        barrageGroupRef.current.visible = !isShuffling && !isConverged;
        avatarCloudGroupRef.current.visible = !isShuffling && !isConverged;
    }

    // Trigger Heavy Calculations only when needed
    if (currentStatus === LotteryStatus.CONVERGING && winnerAvatarRef.current && !targetPositionsRef.current?.[0]) {
         processImageToParticles(winnerAvatarRef.current);
    }

    const stateElapsed = (Date.now() - stateStartTimeRef.current) / 1000;

    // --- Special Visual Effects (Group Level) ---

    if (currentStatus === LotteryStatus.SHUFFLING) {
        updateShuffleVisual();
        if (shuffleGroupRef.current) {
            // Elastic Pop In for the Card
            const popDuration = 0.8; 
            const t = Math.min(stateElapsed / popDuration, 1);
            const scale = elasticOut(t); 
            shuffleGroupRef.current.scale.setScalar(scale);
            
            // Hover
            if (t >= 1) {
                shuffleGroupRef.current.position.y = Math.sin(timeRef.current * 3) * 10;
            } else {
                shuffleGroupRef.current.position.y = 0;
            }
        }
    }

    if (barrageGroupRef.current.visible) {
        barrageGroupRef.current.children.forEach((child) => {
            const sprite = child as THREE.Sprite;
            const data = (sprite as any).userData;
            if (data && data.orbitAxis) {
                sprite.position.applyAxisAngle(data.orbitAxis, data.orbitSpeed);
            }
        });
        barrageGroupRef.current.rotation.y -= 0.0005;
    }

    if (avatarCloudGroupRef.current && avatarCloudGroupRef.current.visible) {
        avatarCloudGroupRef.current.children.forEach((child) => {
             const sprite = child as THREE.Sprite;
             const data = (sprite as any).userData;
             if (data && data.basePos) {
                 const floatY = Math.sin(timeRef.current * data.speed + data.phase) * 10;
                 sprite.position.y = data.basePos.y + floatY;
             }
        });
    }

    // --- Particle Dynamics (Vertex Level) ---
    
    if (!rotationGroupRef.current || !particlesRef.current || !targetPositionsRef.current || !targetColorsRef.current || !targetSizesRef.current || !originalPositionsRef.current) return;

    const attributes = particlesRef.current.geometry.attributes;
    const positions = attributes.position.array as Float32Array;
    const colors = attributes.color.array as Float32Array;
    
    const targets = targetPositionsRef.current;
    const targetCols = targetColorsRef.current;
    const origPos = originalPositionsRef.current;

    // --- STATUS MACHINE PHYSICS ---
    
    if (currentStatus === LotteryStatus.ROLLING) {
        // Slowed down animation for weight
        const implodeDuration = 2.5; // Massive charge up time
        
        if (stateElapsed < implodeDuration) {
            // PHASE 1: IMPLODE (Gravity Well)
            const t = stateElapsed / implodeDuration;
            const ease = t * t * t; 
            const scale = 1.0 - (ease * 0.95); 
            
            rotationGroupRef.current.scale.setScalar(scale);
            rotationGroupRef.current.rotation.y += 0.002 * (1-t); // Barely moving while charging
            
        } else {
            // PHASE 2: "GALAXY ENGINE" ROTATION
            const explodeT = (stateElapsed - implodeDuration) * 2; 
            const scale = Math.min(1.5, 0.05 + explodeT * 1.0);
            
            rotationGroupRef.current.scale.setScalar(scale);
            // Drastic reduction: 0.03 -> 0.004. 
            // This is "Interstellar" black hole accretion disk speed. Massive but slow.
            rotationGroupRef.current.rotation.y += 0.004; 
            rotationGroupRef.current.rotation.z = Math.sin(timeRef.current * 0.5) * 0.02; 
        }

    } else if (currentStatus === LotteryStatus.SHUFFLING) {
        // SHOCKWAVE CLEARING
        rotationGroupRef.current.rotation.y += 0.02; 
        rotationGroupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1); 

    } else if (currentStatus === LotteryStatus.IDLE) {
        rotationGroupRef.current.rotation.y += 0.0005; // Almost stationary
        const breath = Math.sin(timeRef.current * 0.5) * 0.02 + 1; // Slow breathing
        rotationGroupRef.current.scale.set(breath, breath, breath);

    } else {
        // CONVERGING
        const currentRot = rotationGroupRef.current.rotation.y;
        const targetRot = Math.round(currentRot / (Math.PI * 2)) * (Math.PI * 2);
        rotationGroupRef.current.rotation.y += (targetRot - currentRot) * 0.05; 
        rotationGroupRef.current.rotation.z *= 0.9;
        rotationGroupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }

    // --- Per Particle Update ---

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        let tx = targets[ix];
        let ty = targets[iy];
        let tz = targets[iz];
        
        let targetR = targetCols[ix];
        let targetG = targetCols[iy];
        let targetB = targetCols[iz];

        if (currentStatus === LotteryStatus.ROLLING) {
             const ox = origPos[ix];
             const oy = origPos[iy];
             const oz = origPos[iz];
             
             // GALAXY FLUID PHYSICS
             // Frequency 0.2/0.1: extremely slow undulation (Deep Ocean / Space warping)
             const offset = Math.sin(timeRef.current * 0.2 + oy * 0.005) * 150;
             const twist = Math.cos(timeRef.current * 0.1 + ox * 0.005);
             
             tx = ox * (1 + twist * 0.3) + offset;
             ty = oy * (1 + twist * 0.3);
             tz = oz * (1 + twist * 0.3);

             // Hot White/Blue Core effect
             targetR = 0.5 + Math.sin(timeRef.current * 2 + i) * 0.5; 
             targetB = 1.0;
             
             // MASSIVE INERTIA / DRAG (Lerp 0.02)
             // Particles struggle to keep up with the force field, creating heavy trails
             positions[ix] += (tx - positions[ix]) * 0.02; 
             positions[iy] += (ty - positions[iy]) * 0.02;
             positions[iz] += (tz - positions[iz]) * 0.02;

        } else if (currentStatus === LotteryStatus.SHUFFLING) {
             // EXPLOSION LOGIC
             const ox = origPos[ix];
             const oy = origPos[iy];
             const oz = origPos[iz];
             
             // Target is extremely far away (6x radius)
             tx = ox * 6.0;
             ty = oy * 6.0;
             tz = oz * 6.0;
             
             // Dim particles to focus on Card
             targetR = 0.05; targetG = 0.1; targetB = 0.2;
             
             // High speed linear interpolation
             positions[ix] += (tx - positions[ix]) * 0.15;
             positions[iy] += (ty - positions[iy]) * 0.15;
             positions[iz] += (tz - positions[iz]) * 0.15;

        } else {
             // CONVERGING / IDLE
             // Standard ease
             positions[ix] += (tx - positions[ix]) * 0.1;
             positions[iy] += (ty - positions[iy]) * 0.1;
             positions[iz] += (tz - positions[iz]) * 0.1;
        }

        colors[ix] += (targetR - colors[ix]) * 0.1;
        colors[iy] += (targetG - colors[iy]) * 0.1;
        colors[iz] += (targetB - colors[iz]) * 0.1;
    }

    attributes.position.needsUpdate = true;
    attributes.color.needsUpdate = true;

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  return <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none" />;
});

export default LotteryScene;