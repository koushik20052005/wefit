"use client";

import { useEffect, useRef, useState } from "react";

export default function CountUp({ value, durationMs = 800, className = "" }: { value: number; durationMs?: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    cancelAnimationFrame(raf.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (value - from) * eased);
      setDisplay(v);
      fromRef.current = v;
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, durationMs]);

  return <span className={className}>{display.toLocaleString("en-IN")}</span>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-2xl bg-white/5 ${className}`} />;
}
