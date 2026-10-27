import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface RainEffectProps {
  density?: number; // 0 to 200 (stored density)
  speed?: number; // 0 to 100
  isDefocused?: boolean; // blurred rain for reading background
  position?: 'fixed' | 'absolute';
  mode?: 'both' | 'interface' | 'reader';
}

export const RainEffect: React.FC<RainEffectProps> = React.memo(({ 
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

    const handleResize = () => {
      updateSize();
    };

    window.addEventListener('resize', handleResize);

    const getDesiredCount = () => {
      const baseDropCount = Math.max(1, Math.floor((width * height) / 14000));
      const count = Math.max(0, Math.floor(baseDropCount * (densityRef.current / 100)));
      return Math.min(isDefocused ? 30 : 110, count);
    };

    interface Drop {
      x: number;
      y: number;
      length: number;
      speedY: number;
      speedX: number;
      opacity: number;
      width: number;
    }

    const drops: Drop[] = [];

    const draw = () => {
      if (width === 0 || height === 0) {
        updateSize();
      }
      ctx.clearRect(0, 0, width, height);

      const desiredCount = getDesiredCount();
      const speedFactor = (speedRef.current / 100) * 0.75;

      // Dynamically add or remove drops on the fly
      if (drops.length < desiredCount) {
        const toAdd = desiredCount - drops.length;
        for (let i = 0; i < toAdd; i++) {
          const length = Math.random() * (isDefocused ? 30 : 20) + (isDefocused ? 20 : 15); // Longer drops
          const opacity = Math.random() * (isDefocused ? 0.2 : 0.35) + 0.1;
          const speedY = (Math.random() * 8 + 12);
          const speedX = (Math.random() * 1.5 - 0.75); // Slight angle/wind
          const widthVal = isDefocused ? Math.random() * 1.5 + 1.5 : Math.random() * 1.0 + 0.75; // Slightly wider drops

          drops.push({
            x: Math.random() * width,
            y: Math.random() * height,
            length,
            speedY,
            speedX,
            opacity,
            width: widthVal
          });
        }
      } else if (drops.length > desiredCount) {
        drops.length = desiredCount;
      }

      if (drops.length === 0) {
        animationFrameId = requestAnimationFrame(draw);
        return;
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

      ctx.lineCap = 'round';
      
      // Batch 1: Background drops (rich visible blue-sky hue for high contrast on light & dark themes)
      ctx.beginPath();
      ctx.strokeStyle = isDefocused ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.45)';
      ctx.lineWidth = isDefocused ? 1.5 : 1.1;
      for (let i = 0; i < drops.length; i++) {
        if (i % 2 === 0) {
          const d = drops[i];
          const isInsideReader = hasReader && (d.x >= rLeft && d.x <= rRight && d.y >= rTop && d.y <= rBottom);
          const isOverModal = !!(modalRect && (d.x >= modalRect.left && d.x <= modalRect.right && d.y >= modalRect.top && d.y <= modalRect.bottom));

          if (mode === 'interface' && isInsideReader && !isOverModal) {
            continue;
          }
          if (mode === 'reader' && (!isInsideReader || isOverModal)) {
            continue;
          }

          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.speedX * speedFactor * 1.5, d.y + d.length);
        }
      }
      ctx.stroke();

      // Batch 2: Foreground drops (vibrant rain drops)
      ctx.beginPath();
      ctx.strokeStyle = isDefocused ? 'rgba(37, 99, 235, 0.55)' : 'rgba(29, 78, 216, 0.8)';
      ctx.lineWidth = isDefocused ? 2.5 : 1.6;
      for (let i = 0; i < drops.length; i++) {
        if (i % 2 !== 0) {
          const d = drops[i];
          const isInsideReader = hasReader && (d.x >= rLeft && d.x <= rRight && d.y >= rTop && d.y <= rBottom);
          const isOverModal = !!(modalRect && (d.x >= modalRect.left && d.x <= modalRect.right && d.y >= modalRect.top && d.y <= modalRect.bottom));

          if (mode === 'interface' && isInsideReader && !isOverModal) {
            continue;
          }
          if (mode === 'reader' && (!isInsideReader || isOverModal)) {
            continue;
          }

          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.speedX * speedFactor * 1.5, d.y + d.length);
        }
      }
      ctx.stroke();

      // Coordinate update loop (combined and clean)
      if (speedFactor > 0) {
        for (let i = 0; i < drops.length; i++) {
          const d = drops[i];
          d.y += d.speedY * speedFactor * 5;
          d.x += d.speedX * speedFactor * 5;

          // Reset drop when off bottom
          if (d.y > height + 20) {
            d.x = Math.random() * width;
            d.y = -d.length - Math.random() * 30;
          }
          if (d.x > width + 20) {
            d.x = -10;
          } else if (d.x < -20) {
            d.x = width + 10;
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
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
