"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyError, useToast } from "@/components/Toast";
import { IconBolt, IconEye, IconEyeOff } from "@/components/icons";
import Logo from "@/components/Logo";
import { Btn } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast("Enter your email and password.", "error");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast("Welcome back. Time to work.", "success");
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        toast("Account created. Let's set you up.", "success");
      }
      router.replace("/");
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-enter flex min-h-dvh flex-col px-6 pb-10 pt-16">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="pop-in mb-6">
          <Logo size={84} />
        </div>
        <h1 className="text-4xl font-black tracking-tighter">
          WE<span className="text-white/40">FIT</span>
        </h1>
        <p className="mt-2 max-w-[250px] text-sm text-white/50">
          Train. Eat. Repeat. Your gym companion that keeps the streak alive.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-card p-1.5">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn-press rounded-xl py-2.5 text-sm font-bold capitalize transition-all ${
              tab === t ? "bg-white text-black shadow" : "text-white/45"
            }`}
          >
            {t === "login" ? "Log in" : "Register"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Email</label>
          <input
            type="email"
            className="field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              className="field pr-12"
              placeholder={tab === "register" ? "Min. 6 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="btn-press absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/45"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <IconEyeOff width={20} height={20} /> : <IconEye width={20} height={20} />}
            </button>
          </div>
        </div>
        <Btn disabled={busy} className="mt-2 flex items-center justify-center gap-2 py-4 text-base">
          <IconBolt width={20} height={20} />
          {busy ? "Please wait…" : tab === "login" ? "Log in" : "Create account"}
        </Btn>
      </form>

      <div className="mt-8 flex items-center justify-center gap-6 text-white/30">
        <div className="flex items-center gap-1.5 text-xs font-bold"><IconBolt width={14} height={14} /> Smart plans</div>
        <div className="flex items-center gap-1.5 text-xs font-bold"><IconEye width={14} height={14} /> Streaks</div>
        <div className="flex items-center gap-1.5 text-xs font-bold"><IconBolt width={14} height={14} /> 1900+ foods</div>
      </div>

      <p className="mt-6 text-center text-xs text-white/35">
        {tab === "login" ? "New to WEFIT? Tap Register above." : "Already have an account? Tap Log in above."}
      </p>
    </div>
  );
}
