"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  color?: string;
  trackColor?: string;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  durationMs?: number;
}

/** Animated SVG progress ring. Animates stroke draw on mount and on progress change. */
export default function ProgressRing({
  size = 120,
  stroke = 11,
  progress,
  color = "#A3E635",
  trackColor = "rgba(255,255,255,0.08)",
  label,
  sublabel,
  durationMs = 900,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = Math.max(0, Math.min(1, progress));
    const start = performance.now();
    cancelAnimationFrame(raf.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      setDisplay(v);
      fromRef.current = v;
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [progress, durationMs]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - display)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label !== undefined && <span className="text-lg font-extrabold text-white">{label}</span>}
        {sublabel !== undefined && <span className="max-w-[86%] truncate text-center text-[10px] font-medium text-white/50">{sublabel}</span>}
      </div>
    </div>
  );
}
