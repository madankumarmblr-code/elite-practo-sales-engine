import React, { useEffect, useRef } from 'react';

/**
 * Google Antigravity Vortex Particle Simulation
 * 
 * Recreates the exact dynamic orbital particle vortex from https://antigravity.google:
 * - Pure white background (#FFFFFF)
 * - 420+ elongated pill-shaped strokes (capsules) radiating in an expanding spiral vortex
 * - Google signature palette: Blue (#4285F4), Red (#EA4335), Yellow (#FBBC05), Green (#34A853), Purple (#8430CE)
 * - Dynamic flow orientation: each capsule is aligned tangential/radial to the vortex stream
 * - Interactive cursor tracking with spring physics: vortex center eases toward cursor,
 *   particles deflect and swirl when cursor is nearby
 * - Click shockwave ripple effect
 * - High-DPI Retina display support (devicePixelRatio)
 */
export default function GoogleAntigravityBackground({ className = '', style = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Google Antigravity exact signature color palette
    const GOOGLE_PALETTE = [
      '#4285F4', // Google Blue
      '#1A73E8', // Deep Royal Blue
      '#2B7DE9', // Vibrant Blue
      '#EA4335', // Google Red
      '#F84242', // Vibrant Coral Red
      '#FBBC05', // Google Yellow
      '#FFCF03', // Canary Yellow
      '#34A853', // Google Green
      '#0F9D58', // Deep Green
      '#8430CE', // Google Purple
      '#9C27B0', // Violet
      '#FF5722', // Orange Red
      '#00BCD4', // Cyan
    ];

    // Interaction state
    const mouse = {
      x: -9999,
      y: -9999,
      targetX: 0,
      targetY: 0,
      isOver: false,
    };

    const vortexCenter = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    };

    const shockwaves = [];

    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Default vortex center: slightly to the right of center like the screenshot
      vortexCenter.targetX = width * 0.58;
      vortexCenter.targetY = height * 0.48;
      if (vortexCenter.x === 0 && vortexCenter.y === 0) {
        vortexCenter.x = vortexCenter.targetX;
        vortexCenter.y = vortexCenter.targetY;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Particle Generation: 440 particles arranged in concentric spiral vortex rings
    const particleCount = 440;
    const particles = [];
    const maxRadius = Math.max(width, height) * 0.85;

    for (let i = 0; i < particleCount; i++) {
      // Non-linear radius distribution: dense core, expanding arms
      const t = i / particleCount;
      const baseRadius = 50 + Math.pow(t, 1.35) * maxRadius;
      
      // Golden angle spiral distribution + random variance
      const angle = (i * 137.5 * Math.PI) / 180 + (Math.random() * 0.25 - 0.125);
      
      // Orbital speed: inner particles orbit slightly faster
      const speedDirection = 1; // clockwise
      const angularSpeed = (0.0004 + (1 - t) * 0.0008 + Math.random() * 0.0003) * speedDirection;

      // Elongated capsule dimensions: scale with distance (from 7px near core to 18px at perimeter)
      const length = 7 + t * 11 + Math.random() * 3;
      const strokeWidth = 2.2 + Math.random() * 1.6;

      // Twist angle adds that elegant spiral stream curvature
      const twist = 0.18 + Math.random() * 0.18;

      const color = GOOGLE_PALETTE[Math.floor(Math.random() * GOOGLE_PALETTE.length)];
      const baseOpacity = 0.35 + Math.random() * 0.55;

      particles.push({
        baseRadius,
        angle,
        angularSpeed,
        length,
        strokeWidth,
        twist,
        color,
        baseOpacity,
        currentOpacity: baseOpacity,
        radialPhase: Math.random() * Math.PI * 2,
        radialAmp: 6 + Math.random() * 14,
        // Spring physics for mouse repulsion
        dx: 0,
        dy: 0,
        vx: 0,
        vy: 0,
      });
    }

    // Mouse & Touch events
    const onPointerMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.isOver = true;

      // Gentle parallax shift of the vortex origin towards cursor (max 60px shift)
      const offsetX = ((e.clientX / width) - 0.5) * 80;
      const offsetY = ((e.clientY / height) - 0.5) * 60;
      vortexCenter.targetX = width * 0.56 + offsetX;
      vortexCenter.targetY = height * 0.48 + offsetY;
    };

    const onPointerLeave = () => {
      mouse.isOver = false;
      mouse.x = -9999;
      mouse.y = -9999;
      vortexCenter.targetX = width * 0.58;
      vortexCenter.targetY = height * 0.48;
    };

    const onPointerDown = (e) => {
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: 280,
        strength: 22,
        decay: 0.94,
      });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    let time = 0;

    // Animation Loop (60fps)
    const render = () => {
      time += 1;

      // Clear with clean pure white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Smoothly ease vortex center position
      vortexCenter.x += (vortexCenter.targetX - vortexCenter.x) * 0.035;
      vortexCenter.y += (vortexCenter.targetY - vortexCenter.y) * 0.035;

      // Update shockwaves
      for (let s = shockwaves.length - 1; s >= 0; s--) {
        const sw = shockwaves[s];
        sw.radius += 8;
        sw.strength *= sw.decay;
        if (sw.radius > sw.maxRadius || sw.strength < 0.2) {
          shockwaves.splice(s, 1);
        }
      }

      // Render each capsule particle
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];

        // 1. Orbital motion
        p.angle += p.angularSpeed;

        // 2. Radial breathing oscillation
        const breathing = Math.sin(time * 0.015 + p.radialPhase) * p.radialAmp;
        const currentR = p.baseRadius + breathing;

        // 3. Unperturbed position in vortex
        // Slight logarithmic spiral curvature
        const spiralAngle = p.angle + (currentR * 0.00035);
        let px = vortexCenter.x + Math.cos(spiralAngle) * currentR;
        let py = vortexCenter.y + Math.sin(spiralAngle) * currentR * 0.92;

        // 4. Shockwave repulsion
        for (let s = 0; s < shockwaves.length; s++) {
          const sw = shockwaves[s];
          const distToSW = Math.hypot(px - sw.x, py - sw.y);
          const diff = distToSW - sw.radius;
          if (Math.abs(diff) < 40 && distToSW > 0.01) {
            const push = (1 - Math.abs(diff) / 40) * sw.strength;
            const pushAngle = Math.atan2(py - sw.y, px - sw.x);
            p.vx += Math.cos(pushAngle) * push;
            p.vy += Math.sin(pushAngle) * push;
          }
        }

        // 5. Interactive Cursor Repulsion
        if (mouse.isOver) {
          const distToMouse = Math.hypot(px - mouse.x, py - mouse.y);
          const maxRepelDist = 140;

          if (distToMouse < maxRepelDist && distToMouse > 0.1) {
            const repelForce = (1 - distToMouse / maxRepelDist);
            const repelAngle = Math.atan2(py - mouse.y, px - mouse.x);
            
            // Add subtle lateral swirl around cursor
            const swirlAngle = repelAngle + Math.PI * 0.35;
            
            p.vx += (Math.cos(repelAngle) * 3.5 + Math.cos(swirlAngle) * 2.0) * repelForce;
            p.vy += (Math.sin(repelAngle) * 3.5 + Math.sin(swirlAngle) * 2.0) * repelForce;
            
            // Brighten particle near cursor
            p.currentOpacity = Math.min(1.0, p.baseOpacity + 0.35);
          } else {
            p.currentOpacity += (p.baseOpacity - p.currentOpacity) * 0.05;
          }
        } else {
          p.currentOpacity += (p.baseOpacity - p.currentOpacity) * 0.05;
        }

        // 6. Spring Damping for smooth recovery
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.dx += p.vx;
        p.dy += p.vy;
        p.dx *= 0.92;
        p.dy *= 0.92;

        px += p.dx;
        py += p.dy;

        // 7. Dynamic orientation: Capsule points along tangent + radial outflow
        const baseDir = Math.atan2(py - vortexCenter.y, px - vortexCenter.x);
        const orientationAngle = baseDir + p.twist;

        // 8. Draw capsule stroke
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(orientationAngle);

        ctx.beginPath();
        const halfLen = p.length / 2;
        ctx.moveTo(-halfLen, 0);
        ctx.lineTo(halfLen, 0);

        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.strokeWidth;
        ctx.lineCap = 'round';
        ctx.globalAlpha = p.currentOpacity;
        ctx.stroke();

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`google-antigravity-canvas ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
