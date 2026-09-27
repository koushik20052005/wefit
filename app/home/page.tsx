"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TabBar from "@/components/TabBar";
import ProgressRing from "@/components/ProgressRing";
import CountUp, { Skeleton } from "@/components/CountUp";
import { useToast, friendlyError } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/useProfile";
import { calcStreak, formatDateLong, greeting, startOfWeekISO, todayISO } from "@/lib/fitness";
import { IconBolt, IconDrop, IconFlame, IconDumbbell, IconChevronLeft } from "@/components/icons";

const WEEK_GOAL = 5;

export default function HomePage() {
  const { toast } = useToast();
  const { profile, targets, loading: profileLoading } = useProfile();
  const [loading, setLoading] = useState(true);
  const [workoutsWeek, setWorkoutsWeek] = useState(0);
  const [calToday, setCalToday] = useState(0);
  const [waterToday, setWaterToday] = useState(0);
  const [streak, setStreak] = useState(0);
  const [todaySession, setTodaySession] = useState<{ id: string; name: string; completed: boolean | null } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;
        const uid = user.user.id;
        const today = todayISO();
        const weekStart = startOfWeekISO();

        const [sessionsRes, foodRes, waterRes] = await Promise.all([
          supabase.from("workout_sessions").select("id,date,name,completed").eq("user_id", uid).gte("date", weekStart).order("date", { ascending: false }),
          supabase.from("food_logs").select("calories,date").eq("user_id", uid).eq("date", today),
          supabase.from("water_logs").select("ml,date").eq("user_id", uid).eq("date", today),
        ]);
        if (sessionsRes.error) throw sessionsRes.error;
        if (foodRes.error) throw foodRes.error;
        if (waterRes.error) throw waterRes.error;

        const sessions = sessionsRes.data ?? [];
        setWorkoutsWeek(sessions.filter((s) => s.completed).length || sessions.length);
        setCalToday((foodRes.data ?? []).reduce((a, f) => a + Number(f.calories), 0));
        setWaterToday((waterRes.data ?? []).reduce((a, w) => a + Number(w.ml), 0));

        const dates = [
          ...sessions.map((s) => s.date as string),
          ...(foodRes.data ?? []).map((f) => f.date as string),
        ];
        setStreak(calcStreak(dates));

        const todays = sessions.find((s) => s.date === today);
        setTodaySession(todays ? { id: todays.id, name: todays.name, completed: todays.completed } : null);
      } catch (err) {
        toast(friendlyError(err), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const busy = loading || profileLoading;
  const calTarget = targets?.calories ?? 2200;
  const waterTarget = targets?.waterMl ?? 3000;

  return (
    <div className="min-h-dvh pb-28">
      <div className="page-enter px-5 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/50">{formatDateLong(todayISO())}</p>
            <h1 className="mt-0.5 text-2xl font-black">
              {greeting()}{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2">
            <IconFlame width={18} height={18} className={streak > 0 ? "text-orange-400" : "text-white/25"} />
            <span className="text-sm font-extrabold">{streak}</span>
          </div>
        </div>

        {busy ? (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center rounded-3xl bg-card p-3">
              <ProgressRing size={92} stroke={9} progress={Math.min(1, workoutsWeek / WEEK_GOAL)} color="#A3E635"
                label={`${workoutsWeek}/${WEEK_GOAL}`} sublabel="workouts" />
              <p className="mt-1 text-[11px] font-bold text-white/50">This week</p>
            </div>
            <div className="flex flex-col items-center rounded-3xl bg-card p-3">
              <ProgressRing size={92} stroke={9} progress={Math.min(1, calToday / calTarget)} color="#22D3EE"
                label={<CountUp value={Math.round(calToday)} />} sublabel={`of ${calTarget} kcal`} />
              <p className="mt-1 text-[11px] font-bold text-white/50">Calories</p>
            </div>
            <div className="flex flex-col items-center rounded-3xl bg-card p-3">
              <ProgressRing size={92} stroke={9} progress={Math.min(1, waterToday / waterTarget)} color="#60A5FA"
                label={`${(waterToday / 1000).toFixed(1)}L`} sublabel={`of ${(waterTarget / 1000).toFixed(0)}L`} />
              <p className="mt-1 text-[11px] font-bold text-white/50">Water</p>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-lime to-cy p-[1.5px]">
          <div className="rounded-3xl bg-ink/95 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime/15 text-lime">
                  <IconDumbbell width={24} height={24} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/45">Today&apos;s workout</p>
                  <p className="font-extrabold">{todaySession ? todaySession.name : "No session yet"}</p>
                </div>
              </div>
              <Link
                href="/workout"
                className="btn-press flex items-center gap-1 rounded-full bg-gradient-to-r from-lime to-cy px-4 py-2.5 text-sm font-extrabold text-ink"
              >
                {todaySession && !todaySession.completed ? "Resume" : "Start"}
              </Link>
            </div>
            {todaySession?.completed && (
              <p className="mt-2 text-xs font-semibold text-lime">Completed. Nice work — see you tomorrow.</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/diet" className="btn-press rounded-3xl bg-card p-5">
            <IconBolt width={22} height={22} className="text-cy" />
            <p className="mt-2 font-extrabold">Log food</p>
            <p className="text-xs text-white/50">Track calories & macros</p>
          </Link>
          <Link href="/progress" className="btn-press rounded-3xl bg-card p-5">
            <IconDrop width={22} height={22} className="text-lime" />
            <p className="mt-2 font-extrabold">Weigh in</p>
            <p className="text-xs text-white/50">Watch the trend drop</p>
          </Link>
        </div>

        {targets && (
          <div className="mt-4 rounded-3xl bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/45">Daily targets</p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                [`${targets.calories}`, "kcal"],
                [`${targets.protein}g`, "protein"],
                [`${targets.carbs}g`, "carbs"],
                [`${targets.fat}g`, "fat"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/5 py-3">
                  <p className="font-extrabold text-lime">{v}</p>
                  <p className="text-[10px] text-white/50">{l}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <TabBar />
    </div>
  );
}
