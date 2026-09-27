"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyError, useToast } from "@/components/Toast";
import { IconBolt } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        toast("Welcome back!", "success");
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        toast("Account created. Let's set up your profile.", "success");
      }
      router.replace("/");
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-enter flex min-h-dvh flex-col px-6 pb-10 pt-14">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="pulse-ring mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-lime to-cy shadow-[0_0_40px_rgba(163,230,53,0.35)]">
          <span className="text-4xl font-black text-ink">W</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight">
          WE<span className="bg-gradient-to-r from-lime to-cy bg-clip-text text-transparent">FIT</span>
        </h1>
        <p className="mt-2 max-w-[260px] text-sm text-white/55">
          Your gym and diet companion. Train hard, eat smart.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-2xl bg-card p-1.5">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn-press rounded-xl py-2.5 text-sm font-bold capitalize transition-all ${
              tab === t ? "bg-gradient-to-r from-lime to-cy text-ink shadow" : "text-white/50"
            }`}
          >
            {t === "login" ? "Log in" : "Register"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Email</label>
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
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Password</label>
          <input
            type="password"
            className="field"
            placeholder={tab === "register" ? "Min. 6 characters" : "Your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={tab === "login" ? "current-password" : "new-password"}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="btn-press mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-lime to-cy py-4 text-base font-extrabold text-ink shadow-[0_8px_30px_rgba(163,230,53,0.3)] disabled:opacity-50"
        >
          <IconBolt width={20} height={20} />
          {busy ? "Please wait…" : tab === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-white/35">
        {tab === "login" ? "New to WEFIT? Tap Register above." : "Already have an account? Tap Log in above."}
      </p>
    </div>
  );
}
