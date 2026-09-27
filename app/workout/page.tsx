"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TabBar from "@/components/TabBar";
import { Skeleton } from "@/components/CountUp";
import { friendlyError, useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { setVolume, todayISO } from "@/lib/fitness";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/supabase/types";
import { IconCheck, IconDumbbell, IconPlus, IconTimer, IconTrash, IconX } from "@/components/icons";

type Tab = "today" | "library" | "history";

interface SetDraft {
  reps: string;
  weight: string;
}

export default function WorkoutPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("today");
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleFilter, setMuscleFilter] = useState<string>("all");
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({});
  const [restOpen, setRestOpen] = useState(false);
  const [history, setHistory] = useState<(WorkoutSession & { volume: number; sets: number })[]>([]);

  const muscles = useMemo(
    () => ["all", ...Array.from(new Set(exercises.map((e) => e.muscle_group))).sort()],
    [exercises]
  );
  const filtered = useMemo(
    () => (muscleFilter === "all" ? exercises : exercises.filter((e) => e.muscle_group === muscleFilter)),
    [exercises, muscleFilter]
  );
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

  async function loadAll() {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const uid = user.user.id;

      const exRes = await supabase.from("exercises").select("*").order("name");
      if (exRes.error) throw exRes.error;
      setExercises((exRes.data ?? []) as Exercise[]);

      const sessRes = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", uid)
        .eq("date", todayISO())
        .order("created_at", { ascending: false })
        .limit(1);
      if (sessRes.error) throw sessRes.error;
      const active = (sessRes.data?.[0] ?? null) as WorkoutSession | null;
      if (active && !active.completed) {
        setSession(active);
        const setsRes = await supabase.from("workout_sets").select("*").eq("session_id", active.id).order("set_no");
        if (setsRes.error) throw setsRes.error;
        setSets((setsRes.data ?? []) as WorkoutSet[]);
      }

      const histRes = await supabase
        .from("workout_sessions")
        .select("*, workout_sets(reps,weight_kg)")
        .eq("user_id", uid)
        .order("date", { ascending: false })
        .limit(20);
      if (histRes.error) throw histRes.error;
      setHistory(
        ((histRes.data ?? []) as (WorkoutSession & { workout_sets: { reps: number | null; weight_kg: number | null }[] })[]).map((h) => ({
          ...h,
          volume: h.workout_sets.reduce((a, s) => a + setVolume(s.reps, s.weight_kg), 0),
          sets: h.workout_sets.length,
        }))
      );
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startWorkout() {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({ user_id: user.user.id, date: todayISO(), name: sessionName.trim() || "Workout" })
        .select()
        .single();
      if (error) throw error;
      setSession(data as WorkoutSession);
      setSets([]);
      setSessionName("");
      toast("Workout started. Let's go!", "success");
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
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({ user_id: user.user.id, date: todayISO(), name: "Workout" })
        .select()
        .single();
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
      const { data, error } = await supabase
        .from("workout_sets")
        .insert({
          session_id: s.id,
          exercise_id: ex.id,
          exercise_name: ex.name,
          set_no: existing.length + 1,
          reps: 10,
          weight_kg: 0,
          done: false,
        })
        .select()
        .single();
      if (error) throw error;
      setSets((prev) => [...prev, data as WorkoutSet]);
      setTab("today");
      toast(`${ex.name} added`, "success");
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  async function addSet(exerciseId: string | null, exerciseName: string, current: number) {
    if (!session) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("workout_sets")
        .insert({ session_id: session.id, exercise_id: exerciseId, exercise_name: exerciseName, set_no: current + 1, reps: 10, weight_kg: 0, done: false })
        .select()
        .single();
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
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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

  async function finishWorkout() {
    if (!session) return;
    try {
      const supabase = createClient();
      const mins = Math.max(1, Math.round((Date.now() - new Date(session.created_at).getTime()) / 60000));
      const { error: e2 } = await supabase
        .from("workout_sessions")
        .update({ completed: true, duration_min: mins })
        .eq("id", session.id);
      if (e2) throw e2;
      toast("Workout complete. Beast mode!", "success");
      setSession(null);
      setSets([]);
      setLoading(true);
      await loadAll();
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  return (
    <div className="min-h-dvh pb-28">
      <div className="page-enter px-5 pt-8">
        <h1 className="text-2xl font-black">Workout</h1>

        <div className="mt-4 grid grid-cols-3 rounded-2xl bg-card p-1.5">
          {(["today", "library", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`btn-press rounded-xl py-2.5 text-sm font-bold capitalize transition-all ${
                tab === t ? "bg-gradient-to-r from-lime to-cy text-ink shadow" : "text-white/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
          </div>
        ) : (
          <>
            {tab === "today" && (
              <div className="mt-4">
                {!session ? (
                  <div className="rounded-3xl bg-card p-6 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime/15 text-lime">
                      <IconDumbbell width={28} height={28} />
                    </div>
                    <p className="font-extrabold">No active workout</p>
                    <p className="mt-1 text-sm text-white/50">Name it and hit start.</p>
                    <input
                      className="field mt-4"
                      placeholder="e.g. Push Day"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                    />
                    <button
                      onClick={startWorkout}
                      className="btn-press mt-3 w-full rounded-2xl bg-gradient-to-r from-lime to-cy py-3.5 font-extrabold text-ink"
                    >
                      Start workout
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-lime/20 to-cy/20 p-4">
                      <div>
                        <p className="font-extrabold">{session.name}</p>
                        <p className="text-xs text-white/55">
                          {doneCount}/{sets.length} sets done
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setRestOpen(true)} className="btn-press flex items-center gap-1.5 rounded-full bg-card px-4 py-2.5 text-sm font-bold text-cy">
                          <IconTimer width={16} height={16} /> Rest
                        </button>
                        <button onClick={finishWorkout} className="btn-press rounded-full bg-gradient-to-r from-lime to-cy px-4 py-2.5 text-sm font-extrabold text-ink">
                          Finish
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-lime to-cy transition-all duration-500"
                        style={{ width: sets.length ? `${(doneCount / sets.length) * 100}%` : "0%" }}
                      />
                    </div>

                    {grouped.length === 0 && (
                      <p className="mt-6 text-center text-sm text-white/45">
                        Add exercises from the Library tab to begin.
                      </p>
                    )}

                    {grouped.map((g) => (
                      <div key={g.name} className="mt-4 rounded-3xl bg-card p-4">
                        <p className="font-extrabold">{g.name}</p>
                        <div className="mt-3 flex flex-col gap-2">
                          {g.items.map((s) => {
                            const d = draftFor(s.id, s);
                            return (
                              <div
                                key={s.id}
                                className={`flex items-center gap-2 rounded-2xl p-2 transition-colors ${s.done ? "bg-lime/10" : "bg-white/5"}`}
                              >
                                <button
                                  onClick={() => toggleDone(s)}
                                  className={`btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-extrabold transition-all ${
                                    s.done ? "bg-lime text-ink" : "bg-white/10 text-white/40"
                                  }`}
                                >
                                  {s.done ? <IconCheck width={18} height={18} /> : <span className="text-sm">{s.set_no}</span>}
                                </button>
                                <input
                                  type="number"
                                  className="field !py-2.5 text-center"
                                  placeholder="reps"
                                  value={d.reps}
                                  onChange={(e) => setDrafts((p) => ({ ...p, [s.id]: { ...draftFor(s.id, s), reps: e.target.value } }))}
                                  onBlur={() => persistSet(s.id)}
                                  aria-label="reps"
                                />
                                <input
                                  type="number"
                                  className="field !py-2.5 text-center"
                                  placeholder="kg"
                                  value={d.weight}
                                  onChange={(e) => setDrafts((p) => ({ ...p, [s.id]: { ...draftFor(s.id, s), weight: e.target.value } }))}
                                  onBlur={() => persistSet(s.id)}
                                  step="0.5"
                                  aria-label="weight kg"
                                />
                                <button onClick={() => removeSet(s.id)} className="btn-press shrink-0 p-2 text-white/30" aria-label="remove set">
                                  <IconTrash width={18} height={18} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => addSet(g.exerciseId, g.name, g.items.length)}
                          className="btn-press mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 py-2.5 text-sm font-bold text-white/60"
                        >
                          <IconPlus width={16} height={16} /> Add set
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => setTab("library")}
                      className="btn-press mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white/5 py-3.5 font-bold text-lime"
                    >
                      <IconPlus width={18} height={18} /> Add exercise
                    </button>
                  </>
                )}
              </div>
            )}

            {tab === "library" && (
              <div className="mt-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {muscles.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMuscleFilter(m)}
                      className={`btn-press shrink-0 rounded-full border px-4 py-2 text-sm font-bold capitalize transition-all ${
                        muscleFilter === m ? "border-lime bg-lime/15 text-lime" : "border-white/10 bg-card text-white/55"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-col gap-2.5">
                  {filtered.map((ex) => (
                    <div key={ex.id} className="rounded-3xl bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold">{ex.name}</p>
                          <p className="mt-0.5 text-xs capitalize text-white/50">
                            {ex.muscle_group} · {ex.equipment ?? "Bodyweight"} · {ex.difficulty ?? "beginner"}
                          </p>
                          {ex.instructions && <p className="mt-1.5 text-xs leading-relaxed text-white/45">{ex.instructions}</p>}
                        </div>
                        <button
                          onClick={() => addExercise(ex)}
                          className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime/15 text-lime"
                          aria-label={`Add ${ex.name}`}
                        >
                          <IconPlus width={20} height={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filtered.length === 0 && <p className="py-8 text-center text-sm text-white/40">No exercises found.</p>}
                </div>
              </div>
            )}

            {tab === "history" && (
              <div className="mt-4 flex flex-col gap-2.5">
                {history.map((h) => (
                  <div key={h.id} className="rounded-3xl bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-extrabold">{h.name}</p>
                        <p className="text-xs text-white/50">
                          {h.date} · {h.sets} sets · {Math.round(h.volume).toLocaleString("en-IN")} kg volume
                          {h.duration_min ? ` · ${h.duration_min} min` : ""}
                        </p>
                      </div>
                      {h.completed ? (
                        <span className="rounded-full bg-lime/15 px-3 py-1.5 text-xs font-extrabold text-lime">Done</span>
                      ) : (
                        <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/50">Open</span>
                      )}
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <p className="py-8 text-center text-sm text-white/40">No workouts yet. Your history will appear here.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

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
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [running, seconds]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="fade-in fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="modal-in w-full max-w-[430px] rounded-t-[2rem] bg-card p-8 pb-12 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 flex h-12 w-24 items-center justify-center">
          <IconTimer width={28} height={28} className="text-cy" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-white/45">Rest timer</p>
        <p className="my-4 text-6xl font-black tabular-nums text-white">
          {mm}:{ss}
        </p>
        <div className="flex justify-center gap-2">
          {[-15, 15, 30].map((d) => (
            <button
              key={d}
              onClick={() => setSeconds((s) => Math.max(0, s + d))}
              className="btn-press rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/70"
            >
              {d > 0 ? `+${d}s` : `${d}s`}
            </button>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => setRunning((r) => !r)}
            className="btn-press rounded-2xl bg-white/10 py-3.5 font-extrabold text-white"
          >
            {running ? "Pause" : "Resume"}
          </button>
          <button onClick={onClose} className="btn-press rounded-2xl bg-gradient-to-r from-lime to-cy py-3.5 font-extrabold text-ink">
            Skip
          </button>
        </div>
        <button onClick={onClose} className="btn-press mt-4 text-white/40" aria-label="close timer">
          <IconX width={22} height={22} className="mx-auto" />
        </button>
      </div>
    </div>
  );
}
