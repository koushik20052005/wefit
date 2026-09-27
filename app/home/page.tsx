"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TabBar from "@/components/TabBar";
import Logo from "@/components/Logo";
import Ring from "@/components/Ring";
import { Card, SectionTitle, ProgressBar, Skeleton } from "@/components/ui";
import { fireConfetti, FloatText } from "@/components/Confetti";
import { friendlyError, useToast } from "@/components/Toast";
import { useProfile } from "@/components/useProfile";
import { createClient } from "@/lib/supabase/client";
import { greeting, todayISO } from "@/lib/fitness";
import { getWorkoutPlan, todaysPlanDay, type GymMode, type PlanLevel } from "@/lib/recommend";
import { awardFreezes, calcStreak, claimCheckin, getActivityDates, getFreezes, useFreeze } from "@/lib/streak";
import { IconBolt, IconCheck, IconChevronRight, IconDumbbell, IconFlame, IconFood, IconList, IconSnow, IconTrophy } from "@/components/icons";

export default function HomePage() {
  const { toast } = useToast();
  const { profile, targets } = useProfile();
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [activeToday, setActiveToday] = useState(false);
  const [yesterdayMissed, setYesterdayMissed] = useState(false);
  const [freezes, setFreezes] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [floatText, setFloatText] = useState<string | null>(null);
  const [calEaten, setCalEaten] = useState(0);
  const [waterMl, setWaterMl] = useState(0);
  const [workoutsWeek, setWorkoutsWeek] = useState(0);
  const [tasksToday, setTasksToday] = useState(0);
  const [tasksDone, setTasksDone] = useState(0);

  const level: PlanLevel = useMemo(() => {
    if (profile?.level) return profile.level;
    if (typeof window === "undefined") return "beginner";
    return (localStorage.getItem("wefit-level") as PlanLevel) || "beginner";
  }, [profile?.level]);
  const mode: GymMode = useMemo(() => {
    if (profile?.training_mode) return profile.training_mode;
    if (typeof window === "undefined") return "gym";
    return (localStorage.getItem("wefit-mode") as GymMode) || "gym";
  }, [profile?.training_mode]);
  const plan = useMemo(() => getWorkoutPlan(profile?.goal ?? null, level, mode), [profile?.goal, level, mode]);
  const todayPlan = useMemo(() => todaysPlanDay(plan), [plan]);

  function weekStart() {
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return d.toISOString().slice(0, 10);
  }

  async function load() {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const uid = user.user.id;
      const today = todayISO();

      const dates = await getActivityDates(uid);
      const fr = await getFreezes(uid);
      const unused = fr.filter((f) => !f.used_for_date).length;
      setFreezes(unused);
      const { streak: s, yesterdayMissed: ym, activeToday: at } = calcStreak(dates, fr.map((f) => f.used_for_date ?? ""));
      setStreak(s);
      setYesterdayMissed(ym);
      setActiveToday(at);
      const newly = await awardFreezes(uid, s);
      if (newly > 0) {
        setFreezes((f) => f + newly);
        toast(`+${newly} streak freeze earned!`, "success");
      }

      const [fl, wl, ws, dt] = await Promise.all([
        supabase.from("food_logs").select("calories").eq("user_id", uid).eq("date", today),
        supabase.from("water_logs").select("ml").eq("user_id", uid).eq("date", today),
        supabase.from("workout_sessions").select("id").eq("user_id", uid).gte("date", weekStart()),
        supabase.from("day_tasks").select("id,done").eq("user_id", uid).eq("task_date", today),
      ]);
      setCalEaten((fl.data ?? []).reduce((a, r) => a + Number((r as { calories: number }).calories), 0));
      setWaterMl((wl.data ?? []).reduce((a, r) => a + Number((r as { ml: number }).ml), 0));
      setWorkoutsWeek((ws.data ?? []).length);
      setTasksToday((dt.data ?? []).length);
      setTasksDone((dt.data ?? []).filter((t) => (t as { done: boolean }).done).length);
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClaim() {
    if (claiming || activeToday) return;
    setClaiming(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const ok = await claimCheckin(user.user.id);
      if (ok) {
        fireConfetti({ count: 110 });
        setFloatText("+1 day");
        setActiveToday(true);
        setStreak((s) => s + 1);
        toast("Day claimed. Streak lives on.", "success");
      }
    } finally {
      setClaiming(false);
    }
  }

  async function handleFreeze() {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const ok = await useFreeze(user.user.id, todayISO(y));
      if (ok) {
        fireConfetti({ count: 60 });
        setYesterdayMissed(false);
        setFreezes((f) => f - 1);
        setStreak((s) => s + 1);
        toast("Freeze used. Streak saved!", "success");
      } else {
        toast("No freezes available.", "error");
      }
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  const calPct = targets ? (calEaten / targets.calories) * 100 : 0;
  const waterPct = targets ? (waterMl / targets.waterMl) * 100 : 0;

  return (
    <div className="min-h-dvh pb-28">
      <div className="page-enter px-5 pt-7">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={42} />
            <div>
              <p className="text-xs font-bold text-white/40">{greeting()},</p>
              <p className="text-xl font-black tracking-tight">{profile?.name?.split(" ")[0] ?? "Champion"}</p>
            </div>
          </div>
          <Link href="/profile" className="btn-press relative rounded-2xl border border-white/10 bg-card p-3" aria-label="Profile">
            <IconFlame width={22} height={22} className={streak > 0 ? "flame-flicker text-white" : "text-white/30"} />
            {streak > 0 && (
              <span className="pop-in absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-black text-black">
                {streak}
              </span>
            )}
          </Link>
        </div>

        {loading ? (
          <div className="mt-5 flex flex-col gap-3">
            <Skeleton className="h-36" /><Skeleton className="h-28" /><Skeleton className="h-28" />
          </div>
        ) : (
          <>
            {/* streak claim card */}
            <Card className="mt-5 overflow-hidden">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleClaim}
                  disabled={activeToday || claiming}
                  className={`btn-press relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border transition-all ${
                    activeToday ? "border-white bg-white text-black" : "glow-pulse border-white/20 bg-white/5 text-white"
                  }`}
                  aria-label="Claim today's streak"
                >
                  <IconFlame width={38} height={38} className={activeToday ? "" : "flame-flicker"} />
                </button>
                <div className="flex-1">
                  <p className="text-3xl font-black tabular-nums">{streak} <span className="text-base font-bold text-white/40">day streak</span></p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {activeToday ? "Today is locked in. See you tomorrow." : "Tap the flame to claim today."}
                  </p>
                  {freezes > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-bold text-white/60">
                      <IconSnow width={14} height={14} /> {freezes} freeze{freezes > 1 ? "s" : ""} banked
                    </p>
                  )}
                </div>
              </div>
              {yesterdayMissed && freezes > 0 && (
                <button onClick={handleFreeze} className="btn-press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 py-3 text-sm font-bold text-white">
                  <IconSnow width={16} height={16} /> You missed yesterday — use a freeze to save the streak
                </button>
              )}
            </Card>

            {/* rings */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Card className="flex flex-col items-center !p-3">
                <Ring pct={(workoutsWeek / plan.daysPerWeek) * 100} size={84} label={`${workoutsWeek}/${plan.daysPerWeek}`} sub="workouts" />
              </Card>
              <Card className="flex flex-col items-center !p-3">
                <Ring pct={calPct} size={84} label={`${Math.round(calEaten)}`} sub={`of ${targets?.calories ?? "—"} kcal`} />
              </Card>
              <Card className="flex flex-col items-center !p-3">
                <Ring pct={waterPct} size={84} label={`${(waterMl / 1000).toFixed(1)}L`} sub={`of ${((targets?.waterMl ?? 3000) / 1000).toFixed(1)}L`} />
              </Card>
            </div>

            {/* today's recommended workout */}
            <div className="mt-6">
              <SectionTitle
                title="Today's plan"
                sub={plan.name}
                action={<Link href="/workout" className="btn-press flex items-center gap-1 text-sm font-bold text-white/60">All plans <IconChevronRight width={16} height={16} /></Link>}
              />
              {todayPlan ? (
                <Link href="/workout">
                  <Card className="card-press border-white/15 bg-gradient-to-br from-white/[0.07] to-transparent">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-white/40">{todayPlan.day} · {todayPlan.focus}</p>
                        <p className="mt-1 text-lg font-black">{todayPlan.title}</p>
                        <p className="mt-1 text-xs text-white/50">{todayPlan.exercises.length} exercises · ~45 min</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
                        <IconBolt width={22} height={22} />
                      </div>
                    </div>
                    <ProgressBar pct={(workoutsWeek / plan.daysPerWeek) * 100} className="mt-3" />
                  </Card>
                </Link>
              ) : (
                <Card>
                  <p className="text-sm font-bold">Rest day — recovery is training too.</p>
                  <p className="mt-1 text-xs text-white/45">Light walk, stretch, or hit a bonus session from the Workout tab.</p>
                </Card>
              )}
            </div>

            {/* quick actions */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Link href="/workout">
                <Card className="card-press flex flex-col items-center gap-2 !p-4 text-center">
                  <IconDumbbell width={24} height={24} />
                  <span className="text-xs font-bold">Train</span>
                </Card>
              </Link>
              <Link href="/diet">
                <Card className="card-press flex flex-col items-center gap-2 !p-4 text-center">
                  <IconFood width={24} height={24} />
                  <span className="text-xs font-bold">Log food</span>
                </Card>
              </Link>
              <Link href="/planner">
                <Card className="card-press flex flex-col items-center gap-2 !p-4 text-center">
                  <div className="relative">
                    <IconList width={24} height={24} />
                    {tasksToday > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-black">
                        {tasksDone}/{tasksToday}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold">Day plan</span>
                </Card>
              </Link>
            </div>

            {/* diet snapshot */}
            <div className="mt-6">
              <SectionTitle title="Fuel check" sub="Today's nutrition" action={<Link href="/diet" className="btn-press flex items-center gap-1 text-sm font-bold text-white/60">Details <IconChevronRight width={16} height={16} /></Link>} />
              <Card>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-white/60">Calories eaten</span>
                  <span className="font-black tabular-nums">{Math.round(calEaten)} <span className="font-bold text-white/40">/ {targets?.calories ?? "—"}</span></span>
                </div>
                <ProgressBar pct={calPct} className="mt-2" />
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-bold text-white/60">Water</span>
                  <span className="font-black tabular-nums">{(waterMl / 1000).toFixed(1)}L <span className="font-bold text-white/40">/ {((targets?.waterMl ?? 3000) / 1000).toFixed(1)}L</span></span>
                </div>
                <ProgressBar pct={waterPct} className="mt-2" />
              </Card>
            </div>

            {/* PR teaser */}
            <Link href="/workout">
              <Card className="card-press mt-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <IconTrophy width={24} height={24} />
                </div>
                <div className="flex-1">
                  <p className="font-extrabold">Chase a PR today</p>
                  <p className="text-xs text-white/45">Beat your best lift and we'll make it rain.</p>
                </div>
                <IconChevronRight width={18} height={18} className="text-white/30" />
              </Card>
            </Link>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/30">
              <IconCheck width={12} height={12} /> General guidance only — not medical advice.
            </p>
          </>
        )}
      </div>
      {floatText && <FloatText text={floatText} onDone={() => setFloatText(null)} />}
      <TabBar />
    </div>
  );
}
