"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TabBar from "@/components/TabBar";
import Logo from "@/components/Logo";
import { Card, SectionTitle, Chip, Skeleton, Btn, Sheet, ProgressBar, Tile, ModalClose, EmptyState } from "@/components/ui";
import { fireConfetti } from "@/components/Confetti";
import { friendlyError, useToast } from "@/components/Toast";
import { useProfile } from "@/components/useProfile";
import { createClient } from "@/lib/supabase/client";
import { setVolume, todayISO } from "@/lib/fitness";
import { getWorkoutPlan, type GymMode, type PlanDay, type PlanLevel, type WorkoutPlan } from "@/lib/recommend";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/supabase/types";
import { IconBolt, IconCheck, IconChevronRight, IconDumbbell, IconInfo, IconMedal, IconPlay, IconPlus, IconSearch, IconShare, IconTimer, IconTrash, IconTrophy, IconX } from "@/components/icons";

type Tab = "plan" | "train" | "library" | "history";

interface SetDraft { reps: string; weight: string; }
interface HistoryItem extends WorkoutSession { volume: number; sets: number; topLifts: { name: string; weight: number }[]; }

export default function WorkoutPage() {
  const { toast } = useToast();
  const { profile } = useProfile();
  const [tab, setTab] = useState<Tab>("plan");
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<PlanLevel>("beginner");
  const [mode, setMode] = useState<GymMode>("gym");
  const [activeDay, setActiveDay] = useState(0);
  const [detail, setDetail] = useState<Exercise | null>(null);

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({});
  const [restOpen, setRestOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [prs, setPrs] = useState<{ name: string; weight: number }[]>([]);

  const plan: WorkoutPlan = useMemo(() => getWorkoutPlan(profile?.goal ?? null, level, mode), [profile?.goal, level, mode]);

  useEffect(() => {
    setLevel((localStorage.getItem("wefit-level") as PlanLevel) || "beginner");
    setMode((localStorage.getItem("wefit-mode") as GymMode) || "gym");
  }, []);
  useEffect(() => { localStorage.setItem("wefit-level", level); }, [level]);
  useEffect(() => { localStorage.setItem("wefit-mode", mode); }, [mode]);

  const muscles = useMemo(() => ["all", ...Array.from(new Set(exercises.map((e) => e.muscle_group))).sort()], [exercises]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) =>
      (muscleFilter === "all" || e.muscle_group === muscleFilter) &&
      (!q || e.name.toLowerCase().includes(q))
    );
  }, [exercises, muscleFilter, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkoutSet[]>();
    for (const s of sets) {
      const key = s.exercise_name ?? "Exercise";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()].map(([name, items]) => ({
      name,
      exerciseId: items[0].exercise_id,
      items: items.sort((a, b) => a.set_no - b.set_no),
    }));
  }, [sets]);
  const doneCount = sets.filter((s) => s.done).length;

  function matchExercise(name: string): Exercise | undefined {
    const n = name.toLowerCase();
    return exercises.find((e) => e.name.toLowerCase() === n) ?? exercises.find((e) => e.name.toLowerCase().includes(n));
  }

  async function loadAll() {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const uid = user.user.id;

      const exRes = await supabase.from("exercises").select("*").order("name");
      if (exRes.error) throw exRes.error;
      setExercises((exRes.data ?? []) as Exercise[]);

      const sessRes = await supabase.from("workout_sessions").select("*")
        .eq("user_id", uid).eq("date", todayISO()).order("created_at", { ascending: false }).limit(1);
      if (sessRes.error) throw sessRes.error;
      const active = (sessRes.data?.[0] ?? null) as WorkoutSession | null;
      if (active && !active.completed) {
        setSession(active);
        const setsRes = await supabase.from("workout_sets").select("*").eq("session_id", active.id).order("set_no");
        if (setsRes.error) throw setsRes.error;
        setSets((setsRes.data ?? []) as WorkoutSet[]);
        setTab("train");
      }

      const histRes = await supabase.from("workout_sessions").select("*, workout_sets(reps,weight_kg,exercise_name)")
        .eq("user_id", uid).order("date", { ascending: false }).limit(15);
      if (histRes.error) throw histRes.error;
      type H = WorkoutSession & { workout_sets: { reps: number | null; weight_kg: number | null; exercise_name: string | null }[] };
      setHistory(((histRes.data ?? []) as H[]).map((h) => {
        const best = new Map<string, number>();
        for (const s of h.workout_sets) {
          const w = Number(s.weight_kg ?? 0);
          const k = s.exercise_name ?? "";
          if (w > (best.get(k) ?? 0)) best.set(k, w);
        }
        return {
          ...h,
          volume: h.workout_sets.reduce((a, s) => a + setVolume(s.reps, s.weight_kg), 0),
          sets: h.workout_sets.length,
          topLifts: [...best.entries()].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 3)
            .map(([name, weight]) => ({ name, weight })),
        };
      }));
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function startPlanDay(day: PlanDay) {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data: sess, error } = await supabase.from("workout_sessions")
        .insert({ user_id: user.user.id, date: todayISO(), name: day.title }).select().single();
      if (error) throw error;
      const s = sess as WorkoutSession;
      const rows: unknown[] = [];
      for (const pe of day.exercises) {
        const ex = matchExercise(pe.name);
        const repsNum = parseInt(pe.reps, 10);
        for (let i = 0; i < pe.sets; i++) {
          rows.push({
            session_id: s.id,
            exercise_id: ex?.id ?? null,
            exercise_name: pe.name,
            set_no: i + 1,
            reps: Number.isFinite(repsNum) ? repsNum : 10,
            weight_kg: 0,
            done: false,
          });
        }
      }
      const { data: newSets, error: e2 } = await supabase.from("workout_sets").insert(rows as never).select();
      if (e2) throw e2;
      setSession(s);
      setSets((newSets ?? []) as WorkoutSet[]);
      setTab("train");
      fireConfetti({ count: 50 });
      toast(`${day.title} loaded. Let's work.`, "success");
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  async function startBlank() {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data, error } = await supabase.from("workout_sessions")
        .insert({ user_id: user.user.id, date: todayISO(), name: "Freestyle" }).select().single();
      if (error) throw error;
      setSession(data as WorkoutSession);
      setSets([]);
      setTab("train");
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  async function ensureSession(): Promise<WorkoutSession | null> {
    if (session) return session;
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      const { data, error } = await supabase.from("workout_sessions")
        .insert({ user_id: user.user.id, date: todayISO(), name: "Workout" }).select().single();
      if (error) throw error;
      const s = data as WorkoutSession;
      setSession(s);
      setSets([]);
      return s;
    } catch (err) {
      toast(friendlyError(err), "error");
      return null;
    }
  }

  async function addExercise(ex: Exercise) {
    const s = await ensureSession();
    if (!s) return;
    try {
      const supabase = createClient();
      const existing = sets.filter((x) => x.exercise_id === ex.id);
      const { data, error } = await supabase.from("workout_sets").insert({
        session_id: s.id, exercise_id: ex.id, exercise_name: ex.name,
        set_no: existing.length + 1, reps: 10, weight_kg: 0, done: false,
      }).select().single();
      if (error) throw error;
      setSets((prev) => [...prev, data as WorkoutSet]);
      setTab("train");
      toast(`${ex.name} added`, "success");
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  async function addSet(exerciseId: string | null, exerciseName: string, current: number) {
    if (!session) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("workout_sets").insert({
        session_id: session.id, exercise_id: exerciseId, exercise_name: exerciseName,
        set_no: current + 1, reps: 10, weight_kg: 0, done: false,
      }).select().single();
      if (error) throw error;
      setSets((prev) => [...prev, data as WorkoutSet]);
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  function draftFor(id: string, s: WorkoutSet): SetDraft {
    return drafts[id] ?? { reps: String(s.reps ?? ""), weight: String(s.weight_kg ?? "") };
  }

  async function persistSet(id: string) {
    const d = drafts[id];
    if (!d) return;
    const reps = d.reps === "" ? null : Number(d.reps);
    const weight = d.weight === "" ? null : Number(d.weight);
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, reps, weight_kg: weight } : s)));
    setDrafts((prev) => { const n = { ...prev }; delete n[id]; return n; });
    try {
      const supabase = createClient();
      const { error } = await supabase.from("workout_sets").update({ reps, weight_kg: weight }).eq("id", id);
      if (error) throw error;
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  async function toggleDone(s: WorkoutSet) {
    const next = !s.done;
    setSets((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: next } : x)));
    if (next) setRestOpen(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("workout_sets").update({ done: next }).eq("id", s.id);
      if (error) throw error;
    } catch (err) {
      toast(friendlyError(err), "error");
      setSets((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: s.done } : x)));
    }
  }

  async function removeSet(id: string) {
    setSets((prev) => prev.filter((s) => s.id !== id));
    try {
      const supabase = createClient();
      const { error } = await supabase.from("workout_sets").delete().eq("id", id);
      if (error) throw error;
    } catch (err) {
      toast(friendlyError(err), "error");
      loadAll();
    }
  }

  async function detectPRs(current: WorkoutSet[], uid: string, sessionId: string) {
    const bestNow = new Map<string, number>();
    for (const s of current) {
      if (!s.done) continue;
      const w = Number(s.weight_kg ?? 0);
      const k = s.exercise_name ?? "";
      if (w > (bestNow.get(k) ?? 0)) bestNow.set(k, w);
    }
    const found: { name: string; weight: number }[] = [];
    const supabase = createClient();
    for (const [name, w] of bestNow) {
      if (w <= 0) continue;
      const { data } = await supabase.from("workout_sets")
        .select("weight_kg, session_id, workout_sessions!inner(user_id)")
        .eq("exercise_name", name)
        .eq("workout_sessions.user_id", uid)
        .neq("session_id", sessionId);
      const prevBest = Math.max(0, ...((data ?? []) as { weight_kg: number | null }[]).map((r) => Number(r.weight_kg ?? 0)));
      if (w > prevBest && prevBest > 0) found.push({ name, weight: w });
    }
    return found;
  }

  async function finishWorkout() {
    if (!session) return;
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const mins = Math.max(1, Math.round((Date.now() - new Date(session.created_at).getTime()) / 60000));
      const { error } = await supabase.from("workout_sessions").update({ completed: true, duration_min: mins }).eq("id", session.id);
      if (error) throw error;
      const newPRs = await detectPRs(sets, user.user.id, session.id);
      setPrs(newPRs);
      fireConfetti({ count: newPRs.length ? 160 : 90, durationMs: newPRs.length ? 3200 : 2200 });
      setSession(null);
      setSets([]);
      setLoading(true);
      await loadAll();
      setTab("history");
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  function shareWorkout(h: HistoryItem) {
    const c = document.createElement("canvas");
    c.width = 1080; c.height = 1350;
    const x = c.getContext("2d")!;
    x.fillStyle = "#09090b";
    x.fillRect(0, 0, 1080, 1350);
    x.strokeStyle = "rgba(255,255,255,0.15)";
    x.lineWidth = 4;
    x.strokeRect(40, 40, 1000, 1270);
    x.fillStyle = "#fff";
    x.fillRect(90, 110, 120, 120);
    x.fillStyle = "#09090b";
    x.font = "900 84px sans-serif";
    x.fillText("W", 118, 200);
    x.fillStyle = "#fff";
    x.font = "900 72px sans-serif";
    x.fillText("WEFIT", 240, 200);
    x.fillStyle = "rgba(255,255,255,0.5)";
    x.font = "700 40px sans-serif";
    x.fillText(h.date, 90, 300);
    x.fillStyle = "#fff";
    x.font = "900 96px sans-serif";
    const words = h.name.split(" ");
    let line = "";
    let yy = 420;
    for (const w of words) {
      if ((line + " " + w).trim().length > 14) { x.fillText(line.trim(), 90, yy); yy += 110; line = w; }
      else line += " " + w;
    }
    if (line.trim()) { x.fillText(line.trim(), 90, yy); yy += 110; }
    yy += 40;
    x.fillStyle = "rgba(255,255,255,0.55)";
    x.font = "700 44px sans-serif";
    x.fillText(`${h.sets} sets`, 90, yy); yy += 70;
    x.fillText(`${Math.round(h.volume).toLocaleString("en-IN")} kg volume`, 90, yy); yy += 70;
    if (h.duration_min) { x.fillText(`${h.duration_min} min`, 90, yy); yy += 70; }
    yy += 40;
    x.fillStyle = "#fff";
    x.font = "900 48px sans-serif";
    x.fillText("TOP LIFTS", 90, yy); yy += 70;
    x.font = "700 44px sans-serif";
    x.fillStyle = "rgba(255,255,255,0.85)";
    for (const t of h.topLifts.slice(0, 3)) {
      x.fillText(`${t.name} — ${t.weight} kg`, 90, yy); yy += 66;
    }
    x.fillStyle = "rgba(255,255,255,0.4)";
    x.font = "700 36px sans-serif";
    x.fillText("Train. Eat. Repeat.", 90, 1230);
    c.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "wefit-workout.png", { type: "image/png" });
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "My WEFIT workout" });
        } else {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "wefit-workout.png";
          a.click();
          toast("Card downloaded — share it anywhere.", "success");
        }
      } catch { /* user cancelled */ }
    }, "image/png");
  }

  return (
    <div className="min-h-dvh pb-28">
      <div className="page-enter px-5 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight">Workout</h1>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-black">
            <IconDumbbell width={20} height={20} />
          </div>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {(["plan", "train", "library", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`btn-press shrink-0 rounded-full px-5 py-2.5 text-sm font-bold capitalize transition-all ${
                tab === t ? "bg-white text-black" : "border border-white/12 bg-white/5 text-white/55"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-4 flex flex-col gap-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        ) : (
          <>
            {tab === "plan" && (
              <div className="mt-4">
                {/* level + mode */}
                <div className="flex gap-2">
                  <div className="grid flex-1 grid-cols-3 rounded-2xl border border-white/10 bg-card p-1">
                    {(["beginner", "intermediate", "advanced"] as PlanLevel[]).map((l) => (
                      <button key={l} onClick={() => setLevel(l)} className={`btn-press rounded-xl py-2 text-[11px] font-bold capitalize ${level === l ? "bg-white text-black" : "text-white/45"}`}>
                        {l === "beginner" ? "Beginner" : l === "intermediate" ? "Interm." : "Advanced"}
                      </button>
                    ))}
                  </div>
                  <div className="grid w-[132px] grid-cols-2 rounded-2xl border border-white/10 bg-card p-1">
                    {(["gym", "home"] as GymMode[]).map((m) => (
                      <button key={m} onClick={() => setMode(m)} className={`btn-press rounded-xl py-2 text-[11px] font-bold capitalize ${mode === m ? "bg-white text-black" : "text-white/45"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <Card className="mt-3 border-white/15 bg-gradient-to-br from-white/[0.07] to-transparent">
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/40">Recommended for you</p>
                  <p className="mt-1 text-xl font-black">{plan.name}</p>
                  <p className="mt-1 text-sm text-white/50">{plan.tagline}</p>
                  <p className="mt-2 text-xs font-bold text-white/40">{plan.daysPerWeek} days / week</p>
                </Card>

                {/* day selector */}
                <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
                  {plan.days.map((d, i) => (
                    <button
                      key={d.day}
                      onClick={() => setActiveDay(i)}
                      className={`btn-press flex w-16 shrink-0 flex-col items-center rounded-2xl border py-3 transition-all ${
                        activeDay === i ? "border-white bg-white text-black" : "border-white/12 bg-card text-white/55"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase">{d.day}</span>
                      <IconDumbbell width={18} height={18} className="mt-1" />
                    </button>
                  ))}
                </div>

                {plan.days[activeDay] && (
                  <Card key={activeDay} className="pop-in mt-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-white/40">{plan.days[activeDay].focus}</p>
                        <p className="mt-1 text-lg font-black">{plan.days[activeDay].title}</p>
                      </div>
                      <Btn onClick={() => startPlanDay(plan.days[activeDay])} className="!py-2.5 !px-4 text-sm">
                        Start
                      </Btn>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {plan.days[activeDay].exercises.map((pe, i) => {
                        const ex = matchExercise(pe.name);
                        return (
                          <button key={i} onClick={() => ex && setDetail(ex)} className="card-press flex items-center gap-3 rounded-2xl bg-white/[0.04] p-2.5 text-left">
                            <Tile name={pe.name} image={ex?.gif_url} size="sm" />
                            <div className="flex-1">
                              <p className="text-sm font-extrabold">{pe.name}</p>
                              <p className="text-xs text-white/45">{pe.sets} × {pe.reps}</p>
                            </div>
                            <IconChevronRight width={16} height={16} className="text-white/30" />
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={startBlank} className="btn-press mt-3 w-full rounded-2xl border border-dashed border-white/15 py-3 text-sm font-bold text-white/55">
                      Or start a freestyle session
                    </button>
                  </Card>
                )}
                <p className="mt-4 text-center text-[11px] text-white/30">General guidance only — not medical advice.</p>
              </div>
            )}

            {tab === "train" && (
              <div className="mt-4">
                {!session ? (
                  <EmptyState icon={<IconDumbbell width={28} height={28} />} title="No active workout" sub="Pick a plan day or start freestyle." />
                ) : (
                  <>
                    <Card className="border-white/15 bg-gradient-to-br from-white/[0.07] to-transparent">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black">{session.name}</p>
                          <p className="text-xs text-white/50">{doneCount}/{sets.length} sets done</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setRestOpen(true)} className="btn-press flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold">
                            <IconTimer width={16} height={16} /> Rest
                          </button>
                          <button onClick={finishWorkout} className="btn-press rounded-full bg-white px-4 py-2.5 text-sm font-black text-black">
                            Finish
                          </button>
                        </div>
                      </div>
                      <ProgressBar pct={sets.length ? (doneCount / sets.length) * 100 : 0} className="mt-3" />
                    </Card>

                    {grouped.length === 0 && (
                      <p className="mt-6 text-center text-sm text-white/45">Add exercises from the Library tab to begin.</p>
                    )}

                    {grouped.map((g) => (
                      <Card key={g.name} className="mt-3">
                        <button onClick={() => { const ex = matchExercise(g.name); if (ex) setDetail(ex); }} className="flex w-full items-center justify-between text-left">
                          <p className="font-extrabold">{g.name}</p>
                          <IconInfo width={16} height={16} className="text-white/30" />
                        </button>
                        <div className="mt-3 flex flex-col gap-2">
                          {g.items.map((s) => {
                            const d = draftFor(s.id, s);
                            return (
                              <div key={s.id} className={`flex items-center gap-2 rounded-2xl p-2 transition-colors ${s.done ? "bg-white/10" : "bg-white/[0.04]"}`}>
                                <button
                                  onClick={() => toggleDone(s)}
                                  className={`btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-extrabold transition-all ${s.done ? "pop-in bg-white text-black" : "bg-white/10 text-white/40"}`}
                                  aria-label={`toggle set ${s.set_no}`}
                                >
                                  {s.done ? <IconCheck width={18} height={18} /> : <span className="text-sm">{s.set_no}</span>}
                                </button>
                                <input type="number" className="field !py-2.5 text-center" placeholder="reps" value={d.reps}
                                  onChange={(e) => setDrafts((p) => ({ ...p, [s.id]: { ...draftFor(s.id, s), reps: e.target.value } }))}
                                  onBlur={() => persistSet(s.id)} aria-label="reps" />
                                <input type="number" className="field !py-2.5 text-center" placeholder="kg" value={d.weight} step="0.5"
                                  onChange={(e) => setDrafts((p) => ({ ...p, [s.id]: { ...draftFor(s.id, s), weight: e.target.value } }))}
                                  onBlur={() => persistSet(s.id)} aria-label="weight kg" />
                                <button onClick={() => removeSet(s.id)} className="btn-press shrink-0 p-2 text-white/30" aria-label="remove set">
                                  <IconTrash width={18} height={18} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <button onClick={() => addSet(g.exerciseId, g.name, g.items.length)}
                          className="btn-press mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 py-2.5 text-sm font-bold text-white/60">
                          <IconPlus width={16} height={16} /> Add set
                        </button>
                      </Card>
                    ))}

                    <button onClick={() => setTab("library")} className="btn-press mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white/5 py-3.5 font-bold text-white">
                      <IconPlus width={18} height={18} /> Add exercise
                    </button>
                  </>
                )}
              </div>
            )}

            {tab === "library" && (
              <div className="mt-4">
                <div className="relative">
                  <IconSearch width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                  <input className="field !pl-11" placeholder="Search exercises…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-2">
                  {muscles.map((m) => (
                    <Chip key={m} active={muscleFilter === m} onClick={() => setMuscleFilter(m)}>
                      <span className="capitalize">{m}</span>
                    </Chip>
                  ))}
                </div>
                <div className="mt-1 flex flex-col gap-2.5">
                  {filtered.map((ex) => (
                    <Card key={ex.id} className="card-press !p-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setDetail(ex)} className="flex flex-1 items-center gap-3 text-left">
                          <Tile name={ex.name} image={ex.gif_url} size="sm" />
                          <div className="flex-1">
                            <p className="text-sm font-extrabold">{ex.name}</p>
                            <p className="mt-0.5 text-[11px] capitalize text-white/45">
                              {ex.muscle_group} · {ex.equipment ?? "Bodyweight"}
                            </p>
                          </div>
                        </button>
                        <button onClick={() => addExercise(ex)} className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black" aria-label={`Add ${ex.name}`}>
                          <IconPlus width={20} height={20} />
                        </button>
                      </div>
                    </Card>
                  ))}
                  {filtered.length === 0 && <p className="py-8 text-center text-sm text-white/40">No exercises found.</p>}
                </div>
              </div>
            )}

            {tab === "history" && (
              <div className="mt-4 flex flex-col gap-2.5">
                {history.map((h) => (
                  <Card key={h.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-extrabold">{h.name}</p>
                        <p className="text-xs text-white/50">
                          {h.date} · {h.sets} sets · {Math.round(h.volume).toLocaleString("en-IN")} kg
                          {h.duration_min ? ` · ${h.duration_min} min` : ""}
                        </p>
                        {h.topLifts.length > 0 && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-white/60">
                            <IconMedal width={12} height={12} /> {h.topLifts[0].name} — {h.topLifts[0].weight} kg
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {h.completed
                          ? <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-black">Done</span>
                          : <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/50">Open</span>}
                        <button onClick={() => shareWorkout(h)} className="btn-press flex items-center gap-1 text-xs font-bold text-white/55" aria-label="Share workout">
                          <IconShare width={15} height={15} /> Share
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
                {history.length === 0 && (
                  <EmptyState icon={<IconTrophy width={28} height={28} />} title="No workouts yet" sub="Finish a session and it will show up here." />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* exercise detail sheet */}
      {detail && (
        <Sheet onClose={() => setDetail(null)}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-white/40 capitalize">{detail.muscle_group}</p>
              <h3 className="mt-1 text-xl font-black">{detail.name}</h3>
            </div>
            <ModalClose onClose={() => setDetail(null)} />
          </div>
          <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black">
            {detail.gif_url ? (
              <img src={detail.gif_url} alt={detail.name} className="max-h-64 w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-44 items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
                <IconPlay width={40} height={40} className="text-white/30" />
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold capitalize">{detail.equipment ?? "Bodyweight"}</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold capitalize">{detail.difficulty ?? "beginner"}</span>
          </div>
          {detail.instructions && (
            <div className="mt-4">
              <p className="text-sm font-black">How to do it</p>
              <p className="mt-1 text-sm leading-relaxed text-white/60">{detail.instructions}</p>
            </div>
          )}
          {detail.form_tips && (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="flex items-center gap-1.5 text-sm font-black"><IconBolt width={15} height={15} /> Form tips</p>
              <p className="mt-1 text-sm leading-relaxed text-white/60">{detail.form_tips}</p>
            </div>
          )}
          <Btn onClick={() => { addExercise(detail); setDetail(null); }} className="mt-5 w-full">
            Add to workout
          </Btn>
        </Sheet>
      )}

      {/* PR celebration */}
      {prs.length > 0 && (
        <div className="fade-in fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm" onClick={() => setPrs([])}>
          <div className="pop-in w-full max-w-[340px] rounded-[2rem] border border-white/15 bg-card p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="pop-in mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-black">
              <IconTrophy width={38} height={38} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/45">New personal record</p>
            {prs.map((p) => (
              <p key={p.name} className="mt-3 text-lg font-black">{p.name}<br /><span className="text-3xl tabular-nums">{p.weight} kg</span></p>
            ))}
            <Btn onClick={() => setPrs([])} className="mt-6 w-full">Let's gooo</Btn>
          </div>
        </div>
      )}

      {restOpen && <RestTimer onClose={() => setRestOpen(false)} />}
      <TabBar />
    </div>
  );
}

function RestTimer({ onClose }: { onClose: () => void }) {
  const [seconds, setSeconds] = useState(90);
  const [running, setRunning] = useState(true);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && seconds > 0) {
      interval.current = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    }
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [running, seconds]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="fade-in fixed inset-0 z-[80] flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div className="modal-in w-full max-w-[430px] rounded-t-[2rem] border-t border-white/10 bg-card p-8 pb-12 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-black uppercase tracking-widest text-white/40">Rest timer</p>
        <p className="my-4 text-6xl font-black tabular-nums">{mm}:{ss}</p>
        <div className="flex justify-center gap-2">
          {[-15, 15, 30].map((d) => (
            <button key={d} onClick={() => setSeconds((s) => Math.max(0, s + d))} className="btn-press rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/70">
              {d > 0 ? `+${d}s` : `${d}s`}
            </button>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={() => setRunning((r) => !r)} className="btn-press rounded-2xl bg-white/10 py-3.5 font-extrabold text-white">
            {running ? "Pause" : "Resume"}
          </button>
          <button onClick={onClose} className="btn-press rounded-2xl bg-white py-3.5 font-black text-black">Skip</button>
        </div>
        <button onClick={onClose} className="btn-press mt-4 text-white/40" aria-label="close timer">
          <IconX width={22} height={22} className="mx-auto" />
        </button>
      </div>
    </div>
  );
}
