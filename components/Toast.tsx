"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastItem {
  id: number;
  message: string;
  kind: "success" | "error" | "info";
}

const ToastContext = createContext<{
  toast: (message: string, kind?: ToastItem["kind"]) => void;
}>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, kind: ToastItem["kind"] = "info") => {
    const id = ++idRef.current;
    setItems((prev) => [...prev.slice(-2), { id, message, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-6">
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast-in w-full max-w-[380px] rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-2xl backdrop-blur ${
              t.kind === "success"
                ? "bg-white/95 text-black"
                : t.kind === "error"
                  ? "bg-red-500/90 text-white"
                  : "bg-card/95 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(msg)) return "Wrong email or password. Try again.";
  if (/user already registered|already exists/i.test(msg)) return "This email is already registered. Log in instead.";
  if (/password/i.test(msg) && /weak|short|length/i.test(msg)) return "Password must be at least 6 characters.";
  if (/network|fetch failed/i.test(msg)) return "Network error. Check your connection.";
  return msg.length > 120 ? "Something went wrong. Please try again." : msg;
}
