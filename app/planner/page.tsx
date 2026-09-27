"use client";

import { useEffect, useMemo, useState } from "react";
import TabBar from "@/components/TabBar";
import { Card, SectionTitle, Skeleton, Chip, Btn, Sheet, ModalClose, EmptyState } from "@/components/ui";
import { fireConfetti } from "@/components/Confetti";
import { friendlyError, useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/fitness";
import type { DayTask } from "@/lib/supabase/types";
import { IconCheck, IconFlame, IconPlan, IconPlus, IconTrash, IconX } from "@/components/icons";

const KIND_META: Record<DayTask["kind"], { label: string; dot: string }> = {
  workout: { label: "Workout", dot: "bg-white" },
  meal: { label: "Meal", dot: "bg-white/60" },
  water: { label: "Water", dot: "bg-white/60" },
  sleep: { label: "Sleep", dot: "bg-white/60" },
  habit: { label: "Habit", dot: "bg-white/30" },
};

const SUGGESTIONS: Omit<DayTask, "id" | "user_id" | "task_date" | "created_at" | "done" | "position">[] = [
  { title: "Hit the gym", detail: "Follow today's workout plan", kind: "workout" },
  { title: "Hit protein target", detail: "Log every meal in Diet", kind: "meal" },
  { title: "Drink 3L water", detail: "Tap water quick-adds", kind: "water" },
  { title: "Sleep by 11 PM", detail: "Recovery is training too", kind: "sleep" },
  { title: "10k steps", detail: "Walk after dinner", kind: "habit" },
];

export default function PlannerPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<DayTask[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data, error } = await supabase.from("day_tasks").select("*")
        .eq("user_id", user.user.id).eq("task_date", todayISO()).order("position");
      if (error) throw error;
      setTasks((data ?? []) as DayTask[]);
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const doneCount = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? (doneCount / tasks.length) * 100 : 0;
  const allDone = tasks.length > 0 && doneCount === tasks.length;

  async function toggle(task: DayTask) {
    const next = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: next } : t)));
    if (next) {
      fireConfetti({ count: 25, durationMs: 900 });
      if (doneCount + 1 === tasks.length && tasks.length > 0) {
        setTimeout(() => fireConfetti({ count: 120, durationMs: 2200 }), 300);
      }
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.from("day_tasks").update({ done: next }).eq("id", task.id);
      if (error) throw error;
    } catch (err) {
      toast(friendlyError(err), "error");
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
    }
  }

  async function addTask(title: string, detail: string | null, kind: DayTask["kind"]) {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data, error } = await supabase.from("day_tasks").insert({
        user_id: user.user.id, task_date: todayISO(), title, detail, kind,
        done: false, position: tasks.length,
      }).select().single();
      if (error) throw error;
      setTasks((prev) => [...prev, data as DayTask]);
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  async function addSuggestions() {
    for (const s of SUGGESTIONS) {
      if (!tasks.some((t) => t.title === s.title)) await addTask(s.title, s.detail ?? null, s.kind);
    }
    toast("Today's plan is ready", "success");
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      const supabase = createClient();
      const { error } = await supabase.from("day_tasks").delete().eq("id", id);
      if (error) throw error;
    } catch (err) {
      toast(friendlyError(err), "error");
      load();
    }
  }

  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  }, []);

  return (
    <div className="min-h-dvh pb-28">
      <div className="page-enter px-5 pt-8">
        <h1 className="text-2xl font-black tracking-tight">Planner</h1>
        <p className="mt-0.5 text-sm text-white/50">{todayLabel}</p>

        {loading ? (
          <div className="mt-4 flex flex-col gap-3"><Skeleton className="h-28" /><Skeleton className="h-20" /></div>
        ) : (
          <>
            {/* progress hero */}
            <Card className="mt-4 !p-5">
              <div className="flex items-center justify-between">
                <p className="text-lg font-black">{allDone ? "Perfect day." : "Today's progress"}</p>
                <Chip>{doneCount}/{tasks.length} done</Chip>
              </div>
              <div className="mt-3 h-4 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full bg-white transition-all duration-700 ${allDone ? "animate-pulse" : ""}`} style={{ width: `${pct}%` }} />
              </div>
              {allDone ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-white/70">
                  <IconFlame width={16} height={16} /> Every task crushed. Rest well tonight.
                </p>
              ) : (
                <p className="mt-2 text-sm text-white/50">{tasks.length - doneCount} task{tasks.length - doneCount === 1 ? "" : "s"} to go. One at a time.</p>
              )}
            </Card>

            {tasks.length === 0 ? (
              <EmptyState
                icon={<IconPlan width={30} height={30} />}
                title="Plan your perfect day"
                sub="Add tasks or start from a suggested template."
                action={<Btn onClick={addSuggestions}>Use today's template</Btn>}
              />
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className={`card-press flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${t.done ? "border-white/10 bg-white/[0.03]" : "border-white/10 bg-card"}`}
                  >
                    <button
                      onClick={() => toggle(t)}
                      aria-label={t.done ? "Uncheck" : "Complete"}
                      className={`btn-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${t.done ? "pop-in border-white bg-white text-black" : "border-white/25"}`}
                    >
                      {t.done && <IconCheck width={16} height={16} />}
                    </button>
                    <div className="flex-1">
                      <p className={`text-sm font-extrabold ${t.done ? "text-white/35 line-through" : ""}`}>{t.title}</p>
                      {t.detail && <p className="text-[11px] text-white/40">{t.detail}</p>}
                    </div>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${KIND_META[t.kind].dot}`} title={KIND_META[t.kind].label} />
                    <button onClick={() => deleteTask(t.id)} className="btn-press p-1.5 text-white/25" aria-label="delete task">
                      <IconTrash width={15} height={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setModalOpen(true)} className="btn-press mt-4 w-full rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-sm font-bold text-white/50">
              + Add a task
            </button>
          </>
        )}
      </div>

      {modalOpen && (
        <AddTaskModal onClose={() => setModalOpen(false)} onAdd={async (title, detail, kind) => { await addTask(title, detail, kind); setModalOpen(false); }} />
      )}
      <TabBar />
    </div>
  );
}

function AddTaskModal({ onClose, onAdd }: { onClose: () => void; onAdd: (title: string, detail: string | null, kind: DayTask["kind"]) => Promise<void> }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [kind, setKind] = useState<DayTask["kind"]>("habit");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) { toast("Give the task a name.", "error"); return; }
    setBusy(true);
    await onAdd(title.trim(), detail.trim() || null, kind);
    setBusy(false);
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black">New task</h3>
        <ModalClose onClose={onClose} />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <input className="field" placeholder="Task — e.g. Evening walk" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="field" placeholder="Note (optional)" value={detail} onChange={(e) => setDetail(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {Object.entries(KIND_META).map(([k, v]) => (
            <button key={k} onClick={() => setKind(k as DayTask["kind"])} className={`btn-press rounded-full border px-4 py-2 text-xs font-black capitalize ${kind === k ? "border-white bg-white text-black" : "border-white/15 text-white/60"}`}>
              {v.label}
            </button>
          ))}
        </div>
        <Btn onClick={submit} disabled={busy} className="w-full">{busy ? "Adding…" : "Add task"}</Btn>
      </div>
    </Sheet>
  );
}
