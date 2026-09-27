"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { IconBolt } from "./icons";

const PUBLIC_PATHS = ["/login"];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "ok" | "noenv">("loading");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState("noenv");
      return;
    }
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const loggedIn = Boolean(data.session);
      const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));
      if (!loggedIn && !isPublic) router.replace("/login");
      else if (loggedIn && pathname === "/") router.replace("/home");
      else setState("ok");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router, pathname]);

  if (state === "noenv") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink px-6">
        <div className="w-full max-w-sm rounded-3xl bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <IconBolt width={28} height={28} />
          </div>
          <h1 className="text-xl font-extrabold text-white">Almost there</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Copy <code className="text-white">.env.local.example</code> to{" "}
            <code className="text-white">.env.local</code> and paste your Supabase
            anon key. See <code className="text-white">SETUP.md</code>.
          </p>
        </div>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white">
            <span className="text-2xl font-black text-black">W</span>
          </div>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
            <div className="loading-bar h-full w-1/2 rounded-full bg-white" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
