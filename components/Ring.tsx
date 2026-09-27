"use client";

export default function Ring({
  pct, size = 92, stroke = 9, label, sub,
}: {
  pct: number; size?: number; stroke?: number; label: string; sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="#fff" strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * clamped) / 100}
            className="ring-anim"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black tabular-nums leading-none">{label}</span>
          {sub && <span className="mt-0.5 text-[10px] font-bold text-white/40">{sub}</span>}
        </div>
      </div>
    </div>
  );
}
