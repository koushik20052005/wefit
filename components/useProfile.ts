"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcTargets } from "@/lib/fitness";
import type { DayTargets, Profile } from "@/lib/supabase/types";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [targets, setTargets] = useState<DayTargets | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.user.id).single();
      if (data) {
        setProfile(data as Profile);
        if (data.age && data.height_cm && data.weight_kg && data.goal && data.activity_level && data.gender) {
          setTargets(
            calcTargets({
              weight_kg: Number(data.weight_kg),
              height_cm: Number(data.height_cm),
              age: Number(data.age),
              gender: data.gender,
              activity_level: data.activity_level,
              goal: data.goal,
            })
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, targets, loading, refresh };
}
