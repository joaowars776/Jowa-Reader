import React, { useEffect, useRef, useState } from 'react';

interface BorderEffectsCanvasProps {
  effect: 'none' | 'pulse' | 'snow' | 'sand' | 'thunder' | 'rain';
  width: number;
  snowAmount?: number;
  speed?: number;
  thunderAmount?: number;
  side?: 'left' | 'right' | 'both';
  sideBordersWidth?: number;
  isAuroraTheme?: boolean;
  isSnowTheme?: boolean;
  isRainTheme?: boolean;
  isThunderTheme?: boolean;
}

export const BorderEffectsCanvas: React.FC<BorderEffectsCanvasProps> = ({
  effect,
  width: _propWidth,
  snowAmount = 15,
  speed = 50,
  thunderAmount = 20,
  side,
  sideBordersWidth = 40,
  isAuroraTheme = false,
  isSnowTheme = false,
  isRainTheme = false,
  isThunderTheme = false,
}) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResizeWidth = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResizeWidth);
    return () => {
      window.removeEventListener('resize', handleResizeWidth);
    };
  }, []);

  const width = windowWidth;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep slider values in refs for instant, lag-free slider adjustments without recreating the canvas context
  const snowAmountRef = useRef(snowAmount);
  const speedRef = useRef(speed);
  const thunderAmountRef = useRef(thunderAmount);
  const sideBordersWidthRef = useRef(sideBordersWidth);

  const isAuroraThemeRef = useRef(isAuroraTheme);
  const isSnowThemeRef = useRef(isSnowTheme);
  const isRainThemeRef = useRef(isRainTheme);
  const isThunderThemeRef = useRef(isThunderTheme);

  useEffect(() => {
    isAuroraThemeRef.current = isAuroraTheme;
  }, [isAuroraTheme]);

  useEffect(() => {
    isSnowThemeRef.current = isSnowTheme;
  }, [isSnowTheme]);

  useEffect(() => {
    isRainThemeRef.current = isRainTheme;
  }, [isRainTheme]);

  useEffect(() => {
    isThunderThemeRef.current = isThunderTheme;
  }, [isThunderTheme]);

  useEffect(() => {
    snowAmountRef.current = snowAmount;
  }, [snowAmount]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    thunderAmountRef.current = thunderAmount;
  }, [thunderAmount]);

  useEffect(() => {
    sideBordersWidthRef.current = sideBordersWidth;
  }, [sideBordersWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || effect === 'none') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);

    // Update dimensions on resize
    const handleResize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      const rCtx = canvas.getContext('2d');
      if (rCtx) rCtx.scale(dpr, dpr);
    };
    window.addEventListener('resize', handleResize);

    // --- Offscreen Sprite Pre-rendering helper ---
    // Pre-renders a single snowflake onto an offscreen canvas for extremely fast GPU blitting
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
          // Soft fluffy snowflake (circle)
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
            // 6-point detailed crystal structure
            oCtx.beginPath();
            for (let k = 0; k < 6; k++) {
              oCtx.moveTo(0, 0);
              oCtx.lineTo(0, -radius);
              
              // Branch lines
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

    // Pre-renders a single pink lotus/sakura petal onto an offscreen canvas
    const createOffscreenPetal = (radius: number, opacity: number): HTMLCanvasElement => {
      const size = Math.ceil(radius * 3) + 12;
      const offscreen = document.createElement('canvas');
      offscreen.width = size;
      offscreen.height = size;
      const oCtx = offscreen.getContext('2d');
      if (oCtx) {
        oCtx.translate(size / 2, size / 2);
        
        // Soft pink gradient hues (Lotus & Sakura pinks)
        const hue = 330 + Math.random() * 20; // 330 to 350 range
        const saturation = 85 + Math.random() * 15;
        const lightness = 68 + Math.random() * 15;
        
        oCtx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;
        oCtx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness - 12}%, ${opacity * 0.8})`;
        oCtx.lineWidth = Math.max(0.6, radius * 0.08);

        // Draw elegant petal outline with a small notch at the tip (Sakura hallmark)
        oCtx.beginPath();
        oCtx.moveTo(0, radius); // stem base at bottom
        oCtx.quadraticCurveTo(-radius * 1.1, radius * 0.25, -radius * 0.35, -radius * 0.8);
        oCtx.lineTo(0, -radius * 0.62);
        oCtx.lineTo(radius * 0.35, -radius * 0.8);
        oCtx.quadraticCurveTo(radius * 1.1, radius * 0.25, 0, radius);
        oCtx.closePath();
        oCtx.fill();
        oCtx.stroke();
      }
      return offscreen;
    };

    // Pre-render a generous pool of 50 shared snow sprites of various sizes and types on initialization
    const spritesPool: HTMLCanvasElement[] = [];
    const poolSize = 50;
    for (let i = 0; i < poolSize; i++) {
      // Keep snow sizes exactly same as 'Snowy' theme (Math.random() * 3.2 + 1.2) to prevent miniature or giant flakes
      const radius = Math.random() * 3.2 + 1.2;
      const opacity = Math.random() * 0.45 + 0.55; // higher opacity
      const type = Math.floor(Math.random() * 5);
      spritesPool.push(createOffscreenFlake(radius, type, opacity));
    }

    // Pre-render a pool of pink petal sprites
    const petalSpritesPool: HTMLCanvasElement[] = [];
    const petalPoolSize = 12;
    const marginScaleFactor = Math.max(0.3, sideBordersWidthRef.current / 80);
    for (let i = 0; i < petalPoolSize; i++) {
      const radius = (Math.random() * 3.5 + 2.0) * marginScaleFactor; // border petals size, scaled
      const opacity = Math.random() * 0.5 + 0.25;
      petalSpritesPool.push(createOffscreenPetal(radius, opacity));
    }

    // --- Snow State Setup ---
    const flakes: Array<{
      x: number;
      y: number;
      radius: number;
      opacity: number;
      baseSpeedY: number;
      baseSpeedX: number;
      wobble: number;
      wobbleSpeed: number;
      type: number;
      sprite: HTMLCanvasElement;
      assignedSide?: 'left' | 'right';
    }> = [];

    const getDesiredCount = () => {
      const amt = snowAmountRef.current !== undefined ? snowAmountRef.current : 15;
      // Scale down particle count linearly relative to an 80px standard side border width
      // This ensures narrow margins do not look squashed, cluttered, or overcrowded
      const widthFactor = Math.max(0.05, sideBordersWidthRef.current / 80);
      const baseCount = Math.floor(amt * 4);
      // For very narrow borders, allow particle count to scale down as low as 2 to prevent overcrowding/clumping
      const minCount = Math.max(2, Math.floor(5 * widthFactor));
      return Math.max(minCount, Math.floor(baseCount * widthFactor));
    };

    // Helper to get random X either in left or right border or anywhere if side is single
    const getRandomXForParticle = (assignedSide: 'left' | 'right', _safety = 6) => {
      const sideWidth = sideBordersWidthRef.current || 40;
      const margin = Math.max(12, sideWidth);
      
      if (side === 'left' || assignedSide === 'left') {
        return 2 + Math.random() * Math.max(2, margin - 6);
      }
      if (side === 'right' || assignedSide === 'right') {
        return (width - margin + 2) + Math.random() * Math.max(2, margin - 6);
      }
      
      return 2 + Math.random() * Math.max(2, margin - 6);
    };

    // --- Jowa (Rainy Snow) State Setup ---
    const jowaRainDrops: Array<{
      x: number;
      y: number;
      length: number;
      speedY: number;
      speedX: number;
      assignedSide?: 'left' | 'right';
    }> = [];

    // --- Storm (Tempestade) State Setup ---
    const stormRainDrops: Array<{
      x: number;
      y: number;
      length: number;
      speedY: number;
      speedX: number;
      assignedSide?: 'left' | 'right';
    }> = [];

    // --- Side Rain State Setup ---
    const sideRainDrops: Array<{
      x: number;
      y: number;
      length: number;
      speedY: number;
      speedX: number;
      assignedSide?: 'left' | 'right';
    }> = [];

    // --- Petals State Setup ---
    const borderPetals: Array<{
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
      assignedSide?: 'left' | 'right';
    }> = [];

    // --- Thunder / Lightning State Setup ---
    let flashIntensity = 0; // 0 to 1 for full screen/border flash
    let lightningStrikesList: Array<Array<{ x: number; y: number }>> | null = null;
    let strikeOpacity = 0;
    let nextStrikeTime = Date.now() + Math.random() * 4000;

    // Sparks drifting in the wind
    const sparks: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      life: number;
      maxLife: number;
      assignedSide?: 'left' | 'right';
    }> = [];

    const draw = () => {
      if (sideBordersWidthRef.current === 0 && effect !== 'thunder') {
        ctx.clearRect(0, 0, width, window.innerHeight);
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, width, window.innerHeight);

      if (effect === 'snow') {
        const desiredCount = getDesiredCount();
        const speedVal = Math.max(15, speedRef.current !== undefined ? speedRef.current : 50);
        // Float nicely and cozy, speed range from comfortable to swift
        const speedFactor = (speedVal / 100) * 1.5;

        // Dynamically adjust particles on the fly based on current slider ref values
        if (flakes.length < desiredCount) {
          const toAdd = desiredCount - flakes.length;
          for (let i = 0; i < toAdd; i++) {
            const radius = Math.random() * 3.2 + 1.2;
            const opacity = Math.random() * 0.65 + 0.35;
            const type = Math.floor(Math.random() * 5);
            const sprite = spritesPool[Math.floor(Math.random() * poolSize)];
            const assignedSide = Math.random() < 0.5 ? 'left' : 'right';

            flakes.push({
              x: getRandomXForParticle(assignedSide, 12),
              y: Math.random() * window.innerHeight,
              radius,
              opacity,
              baseSpeedY: Math.random() * 0.8 + 0.5, // cozy slow to medium snow
              baseSpeedX: Math.random() * 0.3 - 0.15,
              wobble: Math.random() * Math.PI * 2,
              wobbleSpeed: Math.random() * 0.02 + 0.005,
              type,
              sprite,
              assignedSide
            });
          }
        } else if (flakes.length > desiredCount) {
          flakes.length = desiredCount;
        }

        // Draw all pre-rendered sprites
        for (let i = 0; i < flakes.length; i++) {
          const f = flakes[i];

          f.wobble += f.wobbleSpeed;
          const currentX = f.x + Math.sin(f.wobble) * 1.5;

          ctx.drawImage(f.sprite, currentX - f.sprite.width / 2, f.y - f.sprite.height / 2);

          // Update position - guaranteed downward motion
          f.y += f.baseSpeedY * speedFactor + 0.8;
          f.x += f.baseSpeedX * speedFactor;

          const sideWidth = sideBordersWidthRef.current || 40;
          const margin = Math.max(12, sideWidth);

          // Bound gracefully within margin borders so flakes never glitch
          if (f.assignedSide === 'left') {
            if (f.x < 2) {
              f.x = 2;
              f.baseSpeedX = Math.abs(f.baseSpeedX);
            } else if (f.x > margin - 4) {
              f.x = margin - 4;
              f.baseSpeedX = -Math.abs(f.baseSpeedX);
            }
          } else {
            const minX = width - margin + 2;
            const maxX = width - 2;
            if (f.x < minX) {
              f.x = minX;
              f.baseSpeedX = Math.abs(f.baseSpeedX);
            } else if (f.x > maxX) {
              f.x = maxX;
              f.baseSpeedX = -Math.abs(f.baseSpeedX);
            }
          }

          // Recycle when reaching bottom
          if (f.y > window.innerHeight + 15) {
            f.y = -15 - Math.random() * 20;
            f.x = getRandomXForParticle(f.assignedSide || (Math.random() < 0.5 ? 'left' : 'right'));
          }
        }
      } else if (effect === 'pulse') {
        // --- THE UNIFIED MEGA EFFECT: PULSE + SNOW + STORM (THUNDER) + PETALS ---
        const desiredCount = getDesiredCount();
        const speedVal = speedRef.current !== undefined ? speedRef.current : 50;
        const speedFactor = (speedVal / 100);
        const now = Date.now();

        // 1. SNOWFLAKES IN PULSE (Only if snow theme is active)
        if (isSnowThemeRef.current) {
          const snowCount = Math.max(4, Math.floor(desiredCount * 0.4));
          if (flakes.length < snowCount) {
            const toAdd = snowCount - flakes.length;
            for (let i = 0; i < toAdd; i++) {
              const radius = Math.random() * 1.5 + 1.0;
              const opacity = Math.random() * 0.5 + 0.3;
              const type = Math.floor(Math.random() * 5);
              const sprite = spritesPool[Math.floor(Math.random() * poolSize)];
              const assignedSide = Math.random() < 0.5 ? 'left' : 'right';
              flakes.push({
                x: getRandomXForParticle(assignedSide),
                y: Math.random() * window.innerHeight,
                radius,
                opacity,
                baseSpeedY: Math.random() * 0.4 + 0.2,
                baseSpeedX: Math.random() * 0.2 - 0.1,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: Math.random() * 0.01 + 0.005,
                type,
                sprite,
                assignedSide
              });
            }
          } else if (flakes.length > snowCount) {
            flakes.length = snowCount;
          }

          for (let i = 0; i < flakes.length; i++) {
            const f = flakes[i];
            f.wobble += f.wobbleSpeed;
            const currentX = f.x + Math.sin(f.wobble) * 2.0;
            ctx.drawImage(f.sprite, currentX - f.sprite.width / 2, f.y - f.sprite.height / 2);
            
            f.y += f.baseSpeedY * speedFactor;
            f.x += f.baseSpeedX * speedFactor;

            if (side === 'both') {
              const sideWidth = sideBordersWidthRef.current;
              const halfW = f.sprite.width / 2;
              const safety = halfW + 3.5;
              if (f.assignedSide === 'left') {
                if (f.x > sideWidth - safety) f.x = -halfW;
                if (f.x < -halfW) f.x = sideWidth - safety;
              } else {
                if (f.x < width - sideWidth + safety) f.x = width + halfW;
                if (f.x > width + halfW) f.x = width - sideWidth + safety;
              }
            }

            if (f.y > window.innerHeight + 10) {
              f.x = getRandomXForParticle(f.assignedSide || 'left');
              f.y = -15;
            }
          }
        } else {
          flakes.length = 0;
        }

        // 2. RAINDROPS IN PULSE (Only if rain theme is active)
        if (isRainThemeRef.current) {
          const rainCount = Math.max(5, Math.floor(desiredCount * 0.8));
          if (jowaRainDrops.length < rainCount) {
            const toAdd = rainCount - jowaRainDrops.length;
            for (let i = 0; i < toAdd; i++) {
              const assignedSide = Math.random() < 0.5 ? 'left' : 'right';
              jowaRainDrops.push({
                x: getRandomXForParticle(assignedSide),
                y: Math.random() * window.innerHeight,
                length: Math.random() * 8 + 8,
                speedY: Math.random() * 2.5 + 3.5,
                speedX: -1.5 - Math.random() * 1.0,
                assignedSide
              });
            }
          } else if (jowaRainDrops.length > rainCount) {
            jowaRainDrops.length = rainCount;
          }

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let i = 0; i < jowaRainDrops.length; i++) {
            const d = jowaRainDrops[i];
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x + d.speedX * 0.5, d.y + d.length);
            
            d.y += d.speedY * speedFactor;
            d.x += d.speedX * speedFactor;

            if (side === 'both') {
              const sideWidth = sideBordersWidthRef.current;
              const safety = 4;
              if (d.assignedSide === 'left') {
                if (d.x > sideWidth - safety) d.x = -safety;
                if (d.x < -safety) d.x = sideWidth - safety;
              } else {
                if (d.x < width - sideWidth + safety) d.x = width + safety;
                if (d.x > width + safety) d.x = width - sideWidth + safety;
              }
            }

            if (d.y > window.innerHeight + 15) {
              d.y = -20;
              d.x = getRandomXForParticle(d.assignedSide || 'left', 4);
            }
          }
          ctx.stroke();
        } else {
          jowaRainDrops.length = 0;
        }

        // 3. FALLING PETALS IN PULSE (Only if aurora theme is active)
        if (isAuroraThemeRef.current) {
          const petalCount = Math.max(4, Math.floor(desiredCount * 0.5));
          if (borderPetals.length < petalCount) {
            const toAdd = petalCount - borderPetals.length;
            for (let i = 0; i < toAdd; i++) {
              const assignedSide = Math.random() < 0.5 ? 'left' : 'right';
              const radius = Math.random() * 3.5 + 2.0;
              const opacity = Math.random() * 0.5 + 0.25;
              const sprite = petalSpritesPool[Math.floor(Math.random() * petalPoolSize)];
              borderPetals.push({
                x: getRandomXForParticle(assignedSide),
                y: Math.random() * window.innerHeight,
                radius,
                opacity,
                baseSpeedY: Math.random() * 0.6 + 0.4,
                baseSpeedX: Math.random() * 0.5 - 0.25,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.03,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: Math.random() * 0.02 + 0.01,
                sprite,
                assignedSide
              });
            }
          } else if (borderPetals.length > petalCount) {
            borderPetals.length = petalCount;
          }

          for (let i = 0; i < borderPetals.length; i++) {
            const p = borderPetals[i];
            p.wobble += p.wobbleSpeed;
            p.rotation += p.rotationSpeed;
            const currentX = p.x + Math.sin(p.wobble) * 2.5;

            ctx.save();
            ctx.translate(currentX, p.y);
            ctx.rotate(p.rotation);
            ctx.drawImage(p.sprite, -p.sprite.width / 2, -p.sprite.height / 2);
            ctx.restore();

            p.y += p.baseSpeedY * speedFactor;
            p.x += p.baseSpeedX * speedFactor;

            const halfW = p.sprite.width / 2;
            const safety = halfW + 4;

            if (side === 'both') {
              const sideWidth = sideBordersWidthRef.current;
              if (p.assignedSide === 'left') {
                if (p.x > sideWidth - safety) p.x = -halfW;
                if (p.x < -halfW) p.x = sideWidth - safety;
              } else {
                if (p.x < width - sideWidth + safety) p.x = width + halfW;
                if (p.x > width + halfW) p.x = width - sideWidth + safety;
              }
            }

            if (p.y > window.innerHeight + 15) {
              p.y = -20;
              p.x = getRandomXForParticle(p.assignedSide || 'left', safety);
            }
          }
        } else {
          borderPetals.length = 0;
        }

        // 4. STORM / LIGHTNING (THUNDER) IN PULSE (Only if thunder/storm theme is active)
        if (isThunderThemeRef.current) {
          const stormRainCount = Math.floor((thunderAmountRef.current !== undefined ? thunderAmountRef.current : 20) * 0.8);
          if (stormRainDrops.length < stormRainCount) {
            const toAdd = stormRainCount - stormRainDrops.length;
            for (let i = 0; i < toAdd; i++) {
              const assignedSide = Math.random() < 0.5 ? 'left' : 'right';
              stormRainDrops.push({
                x: getRandomXForParticle(assignedSide),
                y: Math.random() * window.innerHeight,
                length: Math.random() * 12 + 15,
                speedY: Math.random() * 5 + 6,
                speedX: -3 - Math.random() * 2,
                assignedSide
              });
            }
          } else if (stormRainDrops.length > stormRainCount) {
            stormRainDrops.length = stormRainCount;
          }

          ctx.strokeStyle = 'rgba(147, 197, 253, 0.4)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          for (let i = 0; i < stormRainDrops.length; i++) {
            const d = stormRainDrops[i];
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x + d.speedX * 0.4, d.y + d.length);
            
            d.y += d.speedY;
            d.x += d.speedX;

            if (side === 'both') {
              const sideWidth = sideBordersWidthRef.current;
              const safety = 4;
              if (d.assignedSide === 'left') {
                if (d.x > sideWidth - safety) d.x = -safety;
                if (d.x < -safety) d.x = sideWidth - safety;
              } else {
                if (d.x < width - sideWidth + safety) d.x = width + safety;
                if (d.x > width + safety) d.x = width - sideWidth + safety;
              }
            }

            if (d.y > window.innerHeight + 20) {
              d.y = -25;
              d.x = getRandomXForParticle(d.assignedSide || 'left', 4);
            }
          }
          ctx.stroke();

          // Lightning Trigger
          if (now > nextStrikeTime) {
            flashIntensity = 0.5 + Math.random() * 0.4;
            strikeOpacity = 1.0;
            
            const currentStrikes: Array<Array<{ x: number; y: number }>> = [];
            
            const createBolt = (startX: number, xBiasVal: number, angleVary: number) => {
              const segments: Array<{ x: number; y: number }> = [];
              let cx = startX;
              let cy = 0;
              segments.push({ x: cx, y: cy });
              const step = 15;
              while (cy < window.innerHeight) {
                cy += step + Math.random() * 12;
                cx += xBiasVal + (Math.random() - 0.5) * angleVary;
                cx = Math.max(2, Math.min(width - 2, cx));
                segments.push({ x: cx, y: cy });
              }
              return segments;
            };

            const strikeType = Math.floor(Math.random() * 3);
            if (strikeType === 0) {
              currentStrikes.push(createBolt(Math.random() * width, 0, 8));
            } else if (strikeType === 1) {
              const bias = (Math.random() - 0.5) * 4;
              currentStrikes.push(createBolt(Math.random() * width, bias, 18));
            } else {
              const x1 = Math.random() * (width * 0.5);
              const x2 = width * 0.5 + Math.random() * (width * 0.5);
              currentStrikes.push(createBolt(x1, (Math.random() - 0.5) * 2, 12));
              if (Math.random() > 0.3) {
                currentStrikes.push(createBolt(x2, (Math.random() - 0.5) * 2, 12));
              }
            }
            lightningStrikesList = currentStrikes;

            const sparkCount = 10 + Math.floor(Math.random() * 15);
            for (let s = 0; s < sparkCount; s++) {
              const assignedSide = Math.random() < 0.5 ? 'left' : 'right';
              sparks.push({
                x: getRandomXForParticle(assignedSide),
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 2,
                speedY: Math.random() * 1 + 0.5,
                color: Math.random() > 0.5 ? '#60a5fa' : '#a700b3',
                life: 0,
                maxLife: 30 + Math.random() * 30,
                assignedSide
              });
            }

            const freq = thunderAmountRef.current !== undefined ? thunderAmountRef.current : 20;
            const baseInterval = Math.max(1000, 20000 - (freq * 190));
            const randomVariation = (Math.random() - 0.5) * (baseInterval * 0.5);
            nextStrikeTime = now + baseInterval + randomVariation;
          }

          // Screen Flash
          if (flashIntensity > 0) {
            ctx.fillStyle = `rgba(191, 219, 254, ${flashIntensity * 0.25})`;
            ctx.fillRect(0, 0, width, window.innerHeight);
            flashIntensity -= 0.02;
          }

          // Lightning Bolt Path drawing
          if (lightningStrikesList && strikeOpacity > 0) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.strokeStyle = `rgba(186, 230, 253, ${strikeOpacity * 0.25})`;
            ctx.lineWidth = 14 + Math.random() * 6;
            for (const strike of lightningStrikesList) {
              ctx.beginPath();
              ctx.moveTo(strike[0].x, strike[0].y);
              for (let j = 1; j < strike.length; j++) {
                ctx.lineTo(strike[j].x, strike[j].y);
              }
              ctx.stroke();
            }

            ctx.strokeStyle = `rgba(56, 189, 248, ${strikeOpacity * 0.45})`;
            ctx.lineWidth = 6 + Math.random() * 3;
            for (const strike of lightningStrikesList) {
              ctx.beginPath();
              ctx.moveTo(strike[0].x, strike[0].y);
              for (let j = 1; j < strike.length; j++) {
                ctx.lineTo(strike[j].x, strike[j].y);
              }
              ctx.stroke();
            }

            ctx.strokeStyle = `rgba(255, 255, 255, ${strikeOpacity})`;
            ctx.shadowColor = '#0284c7';
            ctx.shadowBlur = 3;
            ctx.lineWidth = 2.0 + Math.random() * 1.5;

            for (const strike of lightningStrikesList) {
              ctx.beginPath();
              ctx.moveTo(strike[0].x, strike[0].y);
              for (let j = 1; j < strike.length; j++) {
                ctx.lineTo(strike[j].x, strike[j].y);
              }
              ctx.stroke();
            }

            ctx.shadowBlur = 0;

            if (Math.random() > 0.6) {
              ctx.strokeStyle = `rgba(96, 165, 250, ${strikeOpacity * 0.7})`;
              ctx.lineWidth = 1.0;
              for (const strike of lightningStrikesList) {
                ctx.beginPath();
                const startIdx = Math.floor(strike.length * 0.3);
                if (strike[startIdx]) {
                  ctx.moveTo(strike[startIdx].x, strike[startIdx].y);
                  let bx = strike[startIdx].x;
                  let by = strike[startIdx].y;
                  for (let k = startIdx + 1; k < Math.min(strike.length, startIdx + 8); k++) {
                    by += 15;
                    bx += (side === 'left' ? -1 : 1) * (5 + Math.random() * 10);
                    ctx.lineTo(bx, by);
                  }
                  ctx.stroke();
                }
              }
            }

            strikeOpacity -= 0.03;
            if (strikeOpacity <= 0) {
              lightningStrikesList = null;
            }
          }

          // Drifting Sparks
          for (let s = sparks.length - 1; s >= 0; s--) {
            const spark = sparks[s];
            ctx.fillStyle = spark.color;
            ctx.fillRect(spark.x, spark.y, spark.size, spark.size);

            spark.y += spark.speedY;
            spark.x += spark.speedX;
            spark.life++;

            if (side === 'both') {
              const sideWidth = sideBordersWidthRef.current;
              const safety = 4;
              if (spark.assignedSide === 'left') {
                if (spark.x > sideWidth - safety) spark.x = 0;
                if (spark.x < 0) spark.x = sideWidth - safety;
              } else {
                if (spark.x < width - sideWidth + safety) spark.x = width;
                if (spark.x > width) spark.x = width - sideWidth + safety;
              }
            }

            if (spark.life >= spark.maxLife || spark.y > window.innerHeight) {
              sparks.splice(s, 1);
            }
          }

          if (Math.random() > 0.985 && sparks.length < 30) {
            ctx.font = '10px sans-serif';
            ctx.fillStyle = 'rgba(251, 191, 36, 0.65)';
            ctx.fillText('⚡', Math.random() * width, Math.random() * window.innerHeight);
          }
        } else {
          stormRainDrops.length = 0;
          lightningStrikesList = null;
          sparks.length = 0;
        }

      } else if (effect === 'sand' || effect === 'thunder') {
        const now = Date.now();

        // 0. Render Storm falling rain
        const rainCount = Math.floor((thunderAmountRef.current !== undefined ? thunderAmountRef.current : 20) * 1.2);
        if (stormRainDrops.length < rainCount) {
          const toAdd = rainCount - stormRainDrops.length;
          for (let i = 0; i < toAdd; i++) {
            const assignedSide = Math.random() < 0.5 ? 'left' : 'right';
            stormRainDrops.push({
              x: getRandomXForParticle(assignedSide),
              y: Math.random() * window.innerHeight,
              length: Math.random() * 12 + 15,
              speedY: Math.random() * 5 + 6, // fast storm rain
              speedX: -3 - Math.random() * 2, // heavy wind diagonal
              assignedSide
            });
          }
        } else if (stormRainDrops.length > rainCount) {
          stormRainDrops.length = rainCount;
        }

        ctx.strokeStyle = 'rgba(147, 197, 253, 0.4)'; // soft bluish rain
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        for (let i = 0; i < stormRainDrops.length; i++) {
          const d = stormRainDrops[i];
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.speedX * 0.4, d.y + d.length);
          
          d.y += d.speedY;
          d.x += d.speedX;

          if (side === 'both') {
            const sideWidth = sideBordersWidthRef.current;
            const safety = 4;
            if (d.assignedSide === 'left') {
              if (d.x > sideWidth - safety) d.x = -safety;
              if (d.x < -safety) d.x = sideWidth - safety;
            } else {
              if (d.x < width - sideWidth + safety) d.x = width + safety;
              if (d.x > width + safety) d.x = width - sideWidth + safety;
            }
          }

          if (d.y > window.innerHeight + 20) {
            d.y = -25;
            d.x = getRandomXForParticle(d.assignedSide || 'left', 4);
          }
        }
        ctx.stroke();

        // 1. Strike trigger with variations (straight, diagonal, multiple areas)
        if (now > nextStrikeTime) {
          flashIntensity = 0.5 + Math.random() * 0.4;
          strikeOpacity = 1.0;
          
          const currentStrikes: Array<Array<{ x: number; y: number }>> = [];
          
          const createBolt = (startX: number, xBiasVal: number, angleVary: number) => {
            const segments: Array<{ x: number; y: number }> = [];
            let cx = startX;
            let cy = 0;
            segments.push({ x: cx, y: cy });
            const step = 15;
            while (cy < window.innerHeight) {
              cy += step + Math.random() * 12;
              cx += xBiasVal + (Math.random() - 0.5) * angleVary;
              cx = Math.max(2, Math.min(width - 2, cx));
              segments.push({ x: cx, y: cy });
            }
            return segments;
          };

          const strikeType = Math.floor(Math.random() * 3);
          if (strikeType === 0) {
            currentStrikes.push(createBolt(Math.random() * width, 0, 8));
          } else if (strikeType === 1) {
            const bias = (Math.random() - 0.5) * 4;
            currentStrikes.push(createBolt(Math.random() * width, bias, 18));
          } else {
            const x1 = Math.random() * (width * 0.5);
            const x2 = width * 0.5 + Math.random() * (width * 0.5);
            currentStrikes.push(createBolt(x1, (Math.random() - 0.5) * 2, 12));
            if (Math.random() > 0.3) {
              currentStrikes.push(createBolt(x2, (Math.random() - 0.5) * 2, 12));
            }
          }
          lightningStrikesList = currentStrikes;

          const sparkCount = 10 + Math.floor(Math.random() * 15);
          for (let s = 0; s < sparkCount; s++) {
            const assignedSide = Math.random() < 0.5 ? 'left' : 'right';
            sparks.push({
              x: getRandomXForParticle(assignedSide),
              y: Math.random() * window.innerHeight,
              size: Math.random() * 2 + 1,
              speedX: (Math.random() - 0.5) * 2,
              speedY: Math.random() * 1 + 0.5,
              color: Math.random() > 0.5 ? '#60a5fa' : '#a700b3',
              life: 0,
              maxLife: 30 + Math.random() * 30,
              assignedSide
            });
          }

          const freq = thunderAmountRef.current !== undefined ? thunderAmountRef.current : 20;
          const baseInterval = Math.max(1000, 20000 - (freq * 190));
          const randomVariation = (Math.random() - 0.5) * (baseInterval * 0.5);
          nextStrikeTime = now + baseInterval + randomVariation;
        }

        // 2. Render Screen Flash
        if (flashIntensity > 0) {
          ctx.fillStyle = `rgba(191, 219, 254, ${flashIntensity * 0.25})`;
          ctx.fillRect(0, 0, width, window.innerHeight);
          flashIntensity -= 0.02;
        }

        // 3. Render Lightning Bolt Paths
        if (lightningStrikesList && strikeOpacity > 0) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.strokeStyle = `rgba(186, 230, 253, ${strikeOpacity * 0.25})`;
          ctx.lineWidth = 14 + Math.random() * 6;
          for (const strike of lightningStrikesList) {
            ctx.beginPath();
            ctx.moveTo(strike[0].x, strike[0].y);
            for (let j = 1; j < strike.length; j++) {
              ctx.lineTo(strike[j].x, strike[j].y);
            }
            ctx.stroke();
          }

          ctx.strokeStyle = `rgba(56, 189, 248, ${strikeOpacity * 0.45})`;
          ctx.lineWidth = 6 + Math.random() * 3;
          for (const strike of lightningStrikesList) {
            ctx.beginPath();
            ctx.moveTo(strike[0].x, strike[0].y);
            for (let j = 1; j < strike.length; j++) {
              ctx.lineTo(strike[j].x, strike[j].y);
            }
            ctx.stroke();
          }

          ctx.strokeStyle = `rgba(255, 255, 255, ${strikeOpacity})`;
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 3;
          ctx.lineWidth = 2.0 + Math.random() * 1.5;

          for (const strike of lightningStrikesList) {
            ctx.beginPath();
            ctx.moveTo(strike[0].x, strike[0].y);
            for (let j = 1; j < strike.length; j++) {
              ctx.lineTo(strike[j].x, strike[j].y);
            }
            ctx.stroke();
          }

          ctx.shadowBlur = 0;

          if (Math.random() > 0.6) {
            ctx.strokeStyle = `rgba(96, 165, 250, ${strikeOpacity * 0.7})`;
            ctx.lineWidth = 1.0;
            for (const strike of lightningStrikesList) {
              ctx.beginPath();
              const startIdx = Math.floor(strike.length * 0.3);
              if (strike[startIdx]) {
                ctx.moveTo(strike[startIdx].x, strike[startIdx].y);
                let bx = strike[startIdx].x;
                let by = strike[startIdx].y;
                for (let k = startIdx + 1; k < Math.min(strike.length, startIdx + 8); k++) {
                  by += 15;
                  bx += (side === 'left' ? -1 : 1) * (5 + Math.random() * 10);
                  ctx.lineTo(bx, by);
                }
                ctx.stroke();
              }
            }
          }

          strikeOpacity -= 0.03;
          if (strikeOpacity <= 0) {
            lightningStrikesList = null;
          }
        }

        // 4. Render Drifting Sparks
        for (let s = sparks.length - 1; s >= 0; s--) {
          const spark = sparks[s];
          ctx.fillStyle = spark.color;
          ctx.fillRect(spark.x, spark.y, spark.size, spark.size);

          spark.y += spark.speedY;
          spark.x += spark.speedX;
          spark.life++;

          if (side === 'both') {
            const sideWidth = sideBordersWidthRef.current;
            const safety = 4;
            if (spark.assignedSide === 'left') {
              if (spark.x > sideWidth - safety) spark.x = 0;
              if (spark.x < 0) spark.x = sideWidth - safety;
            } else {
              if (spark.x < width - sideWidth + safety) spark.x = width;
              if (spark.x > width) spark.x = width - sideWidth + safety;
            }
          }

          if (spark.life >= spark.maxLife || spark.y > window.innerHeight) {
            sparks.splice(s, 1);
          }
        }

        if (Math.random() > 0.985 && sparks.length < 30) {
          ctx.font = '10px sans-serif';
          ctx.fillStyle = 'rgba(251, 191, 36, 0.65)';
          ctx.fillText('⚡', Math.random() * width, Math.random() * window.innerHeight);
        }
      } else if (effect === 'rain') {
        const desiredCount = Math.floor(getDesiredCount() * 1.5);
        const speedVal = Math.max(15, speedRef.current !== undefined ? speedRef.current : 50);
        const speedFactor = (speedVal / 100) * 1.5;

        if (sideRainDrops.length < desiredCount) {
          const toAdd = desiredCount - sideRainDrops.length;
          for (let i = 0; i < toAdd; i++) {
            const assignedSide = Math.random() < 0.5 ? 'left' : 'right';
            sideRainDrops.push({
              x: getRandomXForParticle(assignedSide),
              y: Math.random() * window.innerHeight,
              length: Math.random() * 14 + 10,
              speedY: Math.random() * 8 + 14,
              speedX: Math.random() * 1.2 - 0.6,
              assignedSide
            });
          }
        } else if (sideRainDrops.length > desiredCount) {
          sideRainDrops.length = desiredCount;
        }

        const isDarkTheme = isAuroraThemeRef.current || isRainThemeRef.current || isThunderThemeRef.current || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
        ctx.strokeStyle = isDarkTheme ? 'rgba(174, 219, 255, 0.85)' : 'rgba(29, 78, 216, 0.75)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let i = 0; i < sideRainDrops.length; i++) {
          const d = sideRainDrops[i];
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.speedX * 0.4, d.y + d.length);

          // Update position - continuous downward rain fall
          d.y += d.speedY * speedFactor + 6;
          d.x += d.speedX * speedFactor;

          const sideWidth = sideBordersWidthRef.current || 40;
          const margin = Math.max(12, sideWidth);

          // Bound gracefully within margin borders so raindrops never glitch
          if (d.assignedSide === 'left') {
            if (d.x < 2) {
              d.x = 2;
              d.speedX = Math.abs(d.speedX);
            } else if (d.x > margin - 4) {
              d.x = margin - 4;
              d.speedX = -Math.abs(d.speedX);
            }
          } else {
            const minX = width - margin + 2;
            const maxX = width - 2;
            if (d.x < minX) {
              d.x = minX;
              d.speedX = Math.abs(d.speedX);
            } else if (d.x > maxX) {
              d.x = maxX;
              d.speedX = -Math.abs(d.speedX);
            }
          }

          // Recycle when reaching bottom
          if (d.y > window.innerHeight + 25) {
            d.y = -25 - Math.random() * 20;
            d.x = getRandomXForParticle(d.assignedSide || (Math.random() < 0.5 ? 'left' : 'right'));
          }
        }
        ctx.stroke();

        // Render Thunder/Lightning if thunderAmount is set and > 0
        const currentThunderAmount = thunderAmountRef.current !== undefined ? thunderAmountRef.current : 0;
        if (currentThunderAmount > 0) {
          const now = Date.now();

          // 1. Strike trigger with variations
          if (now > nextStrikeTime) {
            flashIntensity = 0.5 + Math.random() * 0.4;
            strikeOpacity = 1.0;
            
            const currentStrikes: Array<Array<{ x: number; y: number }>> = [];
            
            const createBolt = (startX: number, xBiasVal: number, angleVary: number) => {
              const segments: Array<{ x: number; y: number }> = [];
              let cx = startX;
              let cy = 0;
              segments.push({ x: cx, y: cy });
              const step = 15;
              while (cy < window.innerHeight) {
                cy += step + Math.random() * 12;
                cx += xBiasVal + (Math.random() - 0.5) * angleVary;
                cx = Math.max(2, Math.min(width - 2, cx));
                segments.push({ x: cx, y: cy });
              }
              return segments;
            };

            const strikeType = Math.floor(Math.random() * 3);
            if (strikeType === 0) {
              currentStrikes.push(createBolt(Math.random() * width, 0, 8));
            } else if (strikeType === 1) {
              const bias = (Math.random() - 0.5) * 4;
              currentStrikes.push(createBolt(Math.random() * width, bias, 18));
            } else {
              const x1 = Math.random() * (width * 0.5);
              const x2 = width * 0.5 + Math.random() * (width * 0.5);
              currentStrikes.push(createBolt(x1, (Math.random() - 0.5) * 2, 12));
              if (Math.random() > 0.3) {
                currentStrikes.push(createBolt(x2, (Math.random() - 0.5) * 2, 12));
              }
            }
            lightningStrikesList = currentStrikes;

            const sparkCount = 10 + Math.floor(Math.random() * 15);
            for (let s = 0; s < sparkCount; s++) {
              const assignedSide = Math.random() < 0.5 ? 'left' : 'right';
              sparks.push({
                x: getRandomXForParticle(assignedSide),
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 2,
                speedY: Math.random() * 1 + 0.5,
                color: Math.random() > 0.5 ? '#60a5fa' : '#a700b3',
                life: 0,
                maxLife: 30 + Math.random() * 30,
                assignedSide
              });
            }

            const baseInterval = Math.max(1000, 20000 - (currentThunderAmount * 190));
            const randomVariation = (Math.random() - 0.5) * (baseInterval * 0.5);
            nextStrikeTime = now + baseInterval + randomVariation;
          }

          // 2. Render Screen Flash
          if (flashIntensity > 0) {
            ctx.fillStyle = `rgba(191, 219, 254, ${flashIntensity * 0.25})`;
            ctx.fillRect(0, 0, width, window.innerHeight);
            flashIntensity -= 0.02;
          }

          // 3. Render Lightning Bolt Paths
          if (lightningStrikesList && strikeOpacity > 0) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.strokeStyle = `rgba(186, 230, 253, ${strikeOpacity * 0.25})`;
            ctx.lineWidth = 14 + Math.random() * 6;
            for (const strike of lightningStrikesList) {
              ctx.beginPath();
              ctx.moveTo(strike[0].x, strike[0].y);
              for (let j = 1; j < strike.length; j++) {
                ctx.lineTo(strike[j].x, strike[j].y);
              }
              ctx.stroke();
            }

            ctx.strokeStyle = `rgba(56, 189, 248, ${strikeOpacity * 0.45})`;
            ctx.lineWidth = 6 + Math.random() * 3;
            for (const strike of lightningStrikesList) {
              ctx.beginPath();
              ctx.moveTo(strike[0].x, strike[0].y);
              for (let j = 1; j < strike.length; j++) {
                ctx.lineTo(strike[j].x, strike[j].y);
              }
              ctx.stroke();
            }

            ctx.strokeStyle = `rgba(255, 255, 255, ${strikeOpacity})`;
            ctx.shadowColor = '#0284c7';
            ctx.shadowBlur = 3;
            ctx.lineWidth = 2.0 + Math.random() * 1.5;

            for (const strike of lightningStrikesList) {
              ctx.beginPath();
              ctx.moveTo(strike[0].x, strike[0].y);
              for (let j = 1; j < strike.length; j++) {
                ctx.lineTo(strike[j].x, strike[j].y);
              }
              ctx.stroke();
            }

            ctx.shadowBlur = 0;

            if (Math.random() > 0.6) {
              ctx.strokeStyle = `rgba(96, 165, 250, ${strikeOpacity * 0.7})`;
              ctx.lineWidth = 1.0;
              for (const strike of lightningStrikesList) {
                ctx.beginPath();
                const startIdx = Math.floor(strike.length * 0.3);
                if (strike[startIdx]) {
                  ctx.moveTo(strike[startIdx].x, strike[startIdx].y);
                  let bx = strike[startIdx].x;
                  let by = strike[startIdx].y;
                  for (let k = startIdx + 1; k < Math.min(strike.length, startIdx + 8); k++) {
                    by += 15;
                    bx += (side === 'left' ? -1 : 1) * (5 + Math.random() * 10);
                    ctx.lineTo(bx, by);
                  }
                  ctx.stroke();
                }
              }
            }

            strikeOpacity -= 0.03;
            if (strikeOpacity <= 0) {
              lightningStrikesList = null;
            }
          }

          // 4. Render Drifting Sparks
          for (let s = sparks.length - 1; s >= 0; s--) {
            const spark = sparks[s];
            ctx.fillStyle = spark.color;
            ctx.fillRect(spark.x, spark.y, spark.size, spark.size);

            spark.y += spark.speedY;
            spark.x += spark.speedX;
            spark.life++;

            if (side === 'both') {
              const sideWidth = sideBordersWidthRef.current;
              const safety = 4;
              if (spark.assignedSide === 'left') {
                if (spark.x > sideWidth - safety) spark.x = 0;
                if (spark.x < 0) spark.x = sideWidth - safety;
              } else {
                if (spark.x < width - sideWidth + safety) spark.x = width;
                if (spark.x > width) spark.x = width - sideWidth + safety;
              }
            }

            if (spark.life >= spark.maxLife || spark.y > window.innerHeight) {
              sparks.splice(s, 1);
            }
          }

          if (Math.random() > 0.985 && sparks.length < 30) {
            ctx.font = '10px sans-serif';
            ctx.fillStyle = 'rgba(251, 191, 36, 0.65)';
            ctx.fillText('⚡', Math.random() * width, Math.random() * window.innerHeight);
          }
        } else {
          lightningStrikesList = null;
          sparks.length = 0;
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [effect, width, side, sideBordersWidth]);

  if (effect === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        mixBlendMode: 'normal',
      }}
    />
  );
};
