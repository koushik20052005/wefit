"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    createClient()
      .auth.getSession()
      .then(async ({ data }) => {
        if (!data.session) {
          router.replace("/login");
          return;
        }
        const supabase = createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("age,height_cm,weight_kg,goal")
          .eq("id", data.session.user.id)
          .single();
        if (!profile?.age || !profile?.height_cm || !profile?.weight_kg || !profile?.goal) {
          router.replace("/onboarding");
        } else {
          router.replace("/home");
        }
      });
  }, [router]);

  return null;
}
