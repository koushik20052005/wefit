"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  shape: "rect" | "circle";
  life: number;
}

// Monochrome confetti: whites, grays, with a rare silver pop.
const COLORS = ["#ffffff", "#e4e4e7", "#a1a1aa", "#fafafa", "#d4d4d8", "#71717a"];

export function fireConfetti(opts?: { count?: number; durationMs?: number }) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const count = opts?.count ?? 90;
  const particles: Particle[] = [];
  const cx = window.innerWidth / 2;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 6 + Math.random() * 9;
    particles.push({
      x: cx + (Math.random() - 0.5) * 120,
      y: window.innerHeight * 0.35,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 6,
      size: 5 + Math.random() * 7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      shape: Math.random() > 0.4 ? "rect" : "circle",
      life: 1,
    });
  }

  const start = performance.now();
  const duration = opts?.durationMs ?? 2200;

  function frame(now: number) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const fade = Math.max(0, 1 - elapsed / duration);

    for (const p of particles) {
      p.vy += 0.28; // gravity
      p.vx *= 0.985;
      p.vy *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life = fade;

      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 1.5);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (elapsed < duration) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(frame);
}

/** Floating "+1" style burst text, duolingo-esque. */
export function FloatText({ text, onDone }: { text: string; onDone?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 1150);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      ref={ref}
      className="float-up pointer-events-none fixed left-1/2 top-1/3 z-[9998] -translate-x-1/2 text-4xl font-black text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.35)]"
    >
      {text}
    </div>
  );
}
