import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PetalEffectProps {
  density?: number; // 0 to 200
  speed?: number; // 0 to 100
  isDefocused?: boolean; // blurred petals for reading background
  position?: 'fixed' | 'absolute';
  mode?: 'both' | 'interface' | 'reader';
}

export const PetalEffect: React.FC<PetalEffectProps> = React.memo(({ 
  density = 100, 
  speed = 50, 
  isDefocused = false, 
  position = 'fixed',
  mode = 'both'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep slider values in refs for instant slider adjustments without restarting the canvas
  const densityRef = useRef(density);
  const speedRef = useRef(speed);

  useEffect(() => {
    densityRef.current = density;
  }, [density]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const updateSize = () => {
      if (!canvas) return;
      if (position === 'fixed') {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      } else {
        const parent = canvas.parentElement;
        const rect = parent?.getBoundingClientRect();
        const pWidth = Math.floor(rect?.width || parent?.clientWidth || 0);
        const pHeight = Math.floor(rect?.height || parent?.clientHeight || 0);
        if (pWidth > 0 && pHeight > 0) {
          width = canvas.width = pWidth;
          height = canvas.height = pHeight;
        } else {
          width = canvas.width = window.innerWidth;
          height = canvas.height = window.innerHeight;
        }
      }
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (position === 'absolute' && canvas.parentElement && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(canvas.parentElement);
    }

    const getDesiredCount = () => {
      // Base count tailored for smooth 60fps rendering without lag
      const basePetalCount = Math.max(1, Math.floor((width * height) / 22000));
      const count = Math.max(0, Math.floor(basePetalCount * (densityRef.current / 50)));
      return Math.min(isDefocused ? 50 : 150, count); // Performance-friendly cap
    };

    interface Petal {
      x: number;
      y: number;
      radius: number;
      opacity: number;
      baseSpeedY: number;
      baseSpeedX: number;
      rotation: number;
      rotationSpeed: number;
      wobble: number;
      wobbleSpeed: number;
      sprite: HTMLCanvasElement;
    }

    // Pre-renders a single pink lotus/sakura petal onto an offscreen canvas for extreme performance
    const createOffscreenPetal = (radius: number, opacity: number): HTMLCanvasElement => {
      const size = Math.ceil(radius * 3) + 12;
      const offscreen = document.createElement('canvas');
      offscreen.width = size;
      offscreen.height = size;
      const oCtx = offscreen.getContext('2d');
      if (oCtx) {
        oCtx.translate(size / 2, size / 2);
        
        // Let's create beautiful pink gradients for petals (Lotus & Sakura pinks) with crisp contrast
        const hue = 332 + Math.random() * 16;
        const saturation = 90 + Math.random() * 10;
        const lightness = 64 + Math.random() * 10;
        
        oCtx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;
        oCtx.strokeStyle = `hsla(${hue}, ${saturation}%, 45%, ${opacity * 0.9})`;
        oCtx.lineWidth = Math.max(0.8, radius * 0.12);

        // Draw elegant petal outline with a small notch at the tip (Sakura hallmark)
        oCtx.beginPath();
        oCtx.moveTo(0, radius); // stem base at bottom
        // Left side curve
        oCtx.quadraticCurveTo(-radius * 1.1, radius * 0.25, -radius * 0.35, -radius * 0.8);
        // Notch at tip
        oCtx.lineTo(0, -radius * 0.62);
        oCtx.lineTo(radius * 0.35, -radius * 0.8);
        // Right side curve
        oCtx.quadraticCurveTo(radius * 1.1, radius * 0.25, 0, radius);
        oCtx.closePath();
        oCtx.fill();
        oCtx.stroke();
      }
      return offscreen;
    };

    const petals: Petal[] = [];

    // Pre-render a small pool of 15 shared sprites of various sizes and shades on initialization
    const spritesPool: HTMLCanvasElement[] = [];
    const poolSize = 15;
    for (let i = 0; i < poolSize; i++) {
      const radius = Math.random() * (isDefocused ? 9 : 5.5) + (isDefocused ? 4.5 : 2.5);
      const opacity = Math.random() * (isDefocused ? 0.3 : 0.65) + 0.15;
      spritesPool.push(createOffscreenPetal(radius, opacity));
    }

    const handleResize = () => {
      updateSize();
    };

    window.addEventListener('resize', handleResize);

    const draw = () => {
      if (width === 0 || height === 0) {
        updateSize();
      }
      ctx.clearRect(0, 0, width, height);

      const desiredCount = getDesiredCount();
      const speedFactor = speedRef.current / 50;

      // Add/remove petals dynamically on the fly
      if (petals.length < desiredCount) {
        const toAdd = desiredCount - petals.length;
        for (let i = 0; i < toAdd; i++) {
          const radius = Math.random() * (isDefocused ? 9 : 5.5) + (isDefocused ? 4.5 : 2.5);
          const opacity = Math.random() * (isDefocused ? 0.3 : 0.65) + 0.15;
          const sprite = spritesPool[Math.floor(Math.random() * poolSize)];

          petals.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius,
            opacity,
            baseSpeedY: Math.random() * 0.8 + 0.4,
            baseSpeedX: Math.random() * 0.5 - 0.25,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.015 + 0.005,
            sprite
          });
        }
      } else if (petals.length > desiredCount) {
        petals.length = desiredCount;
      }

      let rTop = 56;
      let rBottom = height;
      let hasReader = false;
      let rLeft = 0;
      let rRight = width;

      const headerEl = document.querySelector('header');
      if (headerEl) {
        rTop = Math.max(0, headerEl.getBoundingClientRect().bottom);
      }

      if (mode === 'interface' || mode === 'reader') {
        const readerArea = document.querySelector('.reader-container') || document.querySelector('.reader-content') || document.querySelector('[data-reader-area="true"]');
        if (readerArea) {
          const rect = readerArea.getBoundingClientRect();
          rLeft = Math.max(0, rect.left);
          rRight = Math.min(width, rect.right);
          hasReader = true;
        } else {
          hasReader = true;
        }
      }

      const openModalEl = (mode === 'interface' || mode === 'reader')
        ? document.querySelector('.toc-panel, [data-settings-panel], .bookmarks-panel, .search-modal, .translate-modal, .user-profile-switcher-popup, [data-modal="true"], .tts-menu-container')
        : null;
      const modalRect = openModalEl ? openModalEl.getBoundingClientRect() : null;

      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];

        // Flutter horizontally (wobble) and rotate
        if (speedFactor > 0) {
          p.wobble += p.wobbleSpeed;
          p.rotation += p.rotationSpeed * speedFactor;
        }
        const currentX = p.x + Math.sin(p.wobble) * 2.2;
        const currentY = p.y;

        // Update position
        if (speedFactor > 0) {
          p.y += p.baseSpeedY * speedFactor;
          p.x += p.baseSpeedX * speedFactor;

          // Recycle petal when it falls past screen bottom
          if (p.y > height + 20) {
            p.x = Math.random() * width;
            p.y = -20;
            p.rotation = Math.random() * Math.PI * 2;
          }

          // Wrap around screen sides with safety margin
          if (p.x > width + 25) {
            p.x = -20;
          } else if (p.x < -25) {
            p.x = width + 20;
          }
        }

        const isInsideReader = hasReader && (currentX >= rLeft && currentX <= rRight && currentY >= rTop && currentY <= rBottom);
        const isOverModal = !!(modalRect && (currentX >= modalRect.left && currentX <= modalRect.right && currentY >= modalRect.top && currentY <= modalRect.bottom));

        if (mode === 'interface' && isInsideReader && !isOverModal) {
          continue;
        }
        if (mode === 'reader' && (!isInsideReader || isOverModal)) {
          continue;
        }

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate(p.rotation);
        ctx.drawImage(p.sprite, -p.sprite.width / 2, -p.sprite.height / 2);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [isDefocused, position, mode]);

  const zIndexClass = isDefocused 
    ? 'z-0 blur-[1px] opacity-60' 
    : (position === 'absolute' ? 'z-10' : (mode === 'both' ? 'z-[9999]' : (mode === 'reader' ? 'z-[20]' : 'z-[35]')));

  const canvas = (
    <canvas
      ref={canvasRef}
      className={`${position === 'absolute' ? 'absolute' : 'fixed'} inset-0 pointer-events-none ${zIndexClass}`}
    />
  );

  return position === 'fixed' ? createPortal(canvas, document.body) : canvas;
});
