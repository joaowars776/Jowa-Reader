import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface SnowEffectProps {
  density?: number; // 0 to 200 (stored density)
  speed?: number; // 0 to 100
  isDefocused?: boolean; // blurred snow for reading background
  position?: 'fixed' | 'absolute';
  mode?: 'both' | 'interface' | 'reader';
}

export const SnowEffect: React.FC<SnowEffectProps> = React.memo(({ 
  density = 100, 
  speed = 50, 
  isDefocused = false, 
  position = 'fixed',
  mode = 'both'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep slider values in refs for instant slider adjustments without restarting the canvas or clearing particles
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
      const baseFlakeCount = Math.max(1, Math.floor((width * height) / 16000));
      const count = Math.max(0, Math.floor(baseFlakeCount * (densityRef.current / 50)));
      return Math.min(isDefocused ? 60 : 200, count); // Performance-friendly cap
    };

    interface Flake {
      x: number;
      y: number;
      radius: number;
      opacity: number;
      baseSpeedY: number;
      baseSpeedX: number;
      wobble: number;
      wobbleSpeed: number;
      type: number; // 0 = soft circle, 1 = asterisk, 2 = 6-point crystal, 3 = sparkle, 4 = diamond
      sprite: HTMLCanvasElement;
    }

    // Pre-renders a single snowflake onto an offscreen canvas
    const createOffscreenFlake = (radius: number, type: number, opacity: number): HTMLCanvasElement => {
      const size = Math.ceil(radius * 2.5) + 12;
      const offscreen = document.createElement('canvas');
      offscreen.width = size;
      offscreen.height = size;
      const oCtx = offscreen.getContext('2d');
      if (oCtx) {
        oCtx.translate(size / 2, size / 2);

        // Add subtle dark drop shadow to make white snow pop beautifully on light themes
        oCtx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        oCtx.shadowBlur = 2.5;
        oCtx.shadowOffsetX = 0.5;
        oCtx.shadowOffsetY = 0.5;

        if (type === 0) {
          // Fluffy soft snowball (simple circle)
          oCtx.beginPath();
          oCtx.arc(0, 0, radius, 0, Math.PI * 2);
          oCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          oCtx.fill();
        } else {
          oCtx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          oCtx.lineWidth = Math.max(0.75, radius * 0.15);
          oCtx.lineCap = 'round';

          if (type === 1) {
            // 6-point Asterisk
            oCtx.beginPath();
            for (let k = 0; k < 6; k++) {
              oCtx.moveTo(0, 0);
              oCtx.lineTo(0, -radius);
              oCtx.rotate(Math.PI / 3);
            }
            oCtx.stroke();
          } else if (type === 2) {
            // Detailed 6-point crystal
            oCtx.beginPath();
            for (let k = 0; k < 6; k++) {
              oCtx.moveTo(0, 0);
              oCtx.lineTo(0, -radius);
              
              // Add crystal branches
              const branchY = -radius * 0.55;
              const branchLength = radius * 0.35;
              oCtx.moveTo(0, branchY);
              oCtx.lineTo(-branchLength, branchY - branchLength);
              oCtx.moveTo(0, branchY);
              oCtx.lineTo(branchLength, branchY - branchLength);
              
              oCtx.rotate(Math.PI / 3);
            }
            oCtx.stroke();
          } else if (type === 3) {
            // 4-point sparkle star
            oCtx.beginPath();
            oCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            for (let k = 0; k < 4; k++) {
              oCtx.lineTo(0, -radius);
              oCtx.lineTo(radius * 0.25, 0);
              oCtx.rotate(Math.PI / 2);
            }
            oCtx.fill();
          } else {
            // Soft fuzzy diamond shape
            oCtx.beginPath();
            oCtx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.95})`;
            oCtx.moveTo(0, -radius);
            oCtx.lineTo(radius * 0.7, 0);
            oCtx.lineTo(0, radius);
            oCtx.lineTo(-radius * 0.7, 0);
            oCtx.closePath();
            oCtx.fill();
          }
        }
      }
      return offscreen;
    };

    const flakes: Flake[] = [];

    // Pre-render a generous pool of 50 shared sprites of various sizes and types on initialization
    const spritesPool: HTMLCanvasElement[] = [];
    const poolSize = 50;
    for (let i = 0; i < poolSize; i++) {
      const radius = Math.random() * (isDefocused ? 6 : 3.2) + (isDefocused ? 1.8 : 1.2);
      const opacity = Math.random() * (isDefocused ? 0.35 : 0.45) + (isDefocused ? 0.15 : 0.55);
      const type = isDefocused ? 0 : Math.floor(Math.random() * 5);
      spritesPool.push(createOffscreenFlake(radius, type, opacity));
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

      // Dynamically add or remove particles on the fly
      if (flakes.length < desiredCount) {
        const toAdd = desiredCount - flakes.length;
        for (let i = 0; i < toAdd; i++) {
          const radius = Math.random() * (isDefocused ? 6 : 3.2) + (isDefocused ? 1.8 : 1.2);
          const opacity = Math.random() * (isDefocused ? 0.35 : 0.6) + 0.15;
          const type = isDefocused ? 0 : Math.floor(Math.random() * 5);
          const sprite = spritesPool[Math.floor(Math.random() * poolSize)];

          flakes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius,
            opacity,
            baseSpeedY: Math.random() * 1.0 + 0.5,
            baseSpeedX: Math.random() * 0.6 - 0.3,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.02 + 0.005,
            type,
            sprite
          });
        }
      } else if (flakes.length > desiredCount) {
        flakes.length = desiredCount;
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

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        
        // Wobble horizontally for natural fall pattern
        if (speedFactor > 0) {
          f.wobble += f.wobbleSpeed;
        }
        const currentX = f.x + Math.sin(f.wobble) * 1.2;
        const currentY = f.y;

        // Update coordinates (only if speed is greater than zero)
        if (speedFactor > 0) {
          f.y += f.baseSpeedY * speedFactor;
          f.x += f.baseSpeedX * speedFactor;

          // Reset to top if off bottom
          if (f.y > height + 10) {
            f.x = Math.random() * width;
            f.y = -15;
          }
          
          // Wrap around sides
          if (f.x > width + 10) {
            f.x = -10;
          } else if (f.x < -10) {
            f.x = width + 10;
          }
        }

        // Reader exclusion/inclusion check
        const isInsideReader = hasReader && (currentX >= rLeft && currentX <= rRight && currentY >= rTop && currentY <= rBottom);
        const isOverModal = !!(modalRect && (currentX >= modalRect.left && currentX <= modalRect.right && currentY >= modalRect.top && currentY <= modalRect.bottom));

        if (mode === 'interface' && isInsideReader && !isOverModal) {
          continue;
        }
        if (mode === 'reader' && (!isInsideReader || isOverModal)) {
          continue;
        }

        // Blit pre-rendered snowflake sprite
        ctx.drawImage(f.sprite, currentX - f.sprite.width / 2, currentY - f.sprite.height / 2);
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
    ? 'z-0 blur-[2px] opacity-60' 
    : (position === 'absolute' ? 'z-10' : (mode === 'both' ? 'z-[9999]' : (mode === 'reader' ? 'z-[20]' : 'z-[35]')));

  const canvas = (
    <canvas
      ref={canvasRef}
      className={`${position === 'absolute' ? 'absolute' : 'fixed'} inset-0 pointer-events-none ${zIndexClass}`}
    />
  );

  return position === 'fixed' ? createPortal(canvas, document.body) : canvas;
});
