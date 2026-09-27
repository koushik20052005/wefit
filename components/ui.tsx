"use client";

import type { ReactNode } from "react";
import { IconX } from "./icons";

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-3xl border border-white/10 bg-card p-4 ${onClick ? "card-press cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <h2 className="text-lg font-black tracking-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-white/45">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Btn({
  children, onClick, variant = "primary", className = "", disabled,
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "outline"; className?: string; disabled?: boolean;
}) {
  const styles =
    variant === "primary"
      ? "bg-white text-black font-extrabold shadow-[0_8px_30px_rgba(255,255,255,0.15)]"
      : variant === "outline"
        ? "border border-white/20 text-white font-bold bg-white/5"
        : "text-white/60 font-bold";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-press rounded-2xl px-5 py-3.5 text-[15px] disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  const cls = `shrink-0 rounded-full border px-4 py-2 text-[13px] font-bold transition-all ${
    active ? "border-white bg-white text-black" : "border-white/12 bg-white/5 text-white/55"
  }`;
  if (onClick) {
    return (
      <button onClick={onClick} className={`btn-press ${cls}`}>
        {children}
      </button>
    );
  }
  return <span className={cls}>{children}</span>;
}

export function Sheet({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fade-in fixed inset-0 z-[80] flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`modal-in w-full ${wide ? "max-w-[430px]" : "max-w-[430px]"} max-h-[88dvh] overflow-y-auto rounded-t-[1.75rem] border-t border-white/10 bg-card p-5 pb-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, sub, action }: { icon: ReactNode; title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.02] p-8 text-center">
      <div className="pop-in mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/8 text-white/70">
        {icon}
      </div>
      <p className="font-extrabold">{title}</p>
      <p className="mt-1 text-sm text-white/45">{sub}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-3xl ${className}`} />;
}

export function ProgressBar({ pct, className = "" }: { pct: number; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div className="bar-anim h-full rounded-full bg-white" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export function ModalClose({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} className="btn-press rounded-full bg-white/10 p-2 text-white/70" aria-label="Close">
      <IconX width={18} height={18} />
    </button>
  );
}

/** Monochrome avatar tile: food/exercise placeholder with initial. */
export function Tile({ name, image, size = "md" }: { name: string; image?: string | null; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-28 w-28 text-4xl rounded-3xl" : size === "sm" ? "h-12 w-12 text-lg rounded-2xl" : "h-16 w-16 text-2xl rounded-2xl";
  if (image) {
    return <img src={image} alt={name} loading="lazy" className={`${dims} shrink-0 border border-white/10 object-cover`} />;
  }
  const initial = name.trim().charAt(0).toUpperCase() || "•";
  return (
    <div className={`${dims} flex shrink-0 items-center justify-center border border-white/10 bg-gradient-to-br from-white/15 via-white/5 to-transparent font-black text-white/80`}>
      {initial}
    </div>
  );
}
