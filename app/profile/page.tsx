"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TabBar from "@/components/TabBar";
import { Card, SectionTitle, Chip, Skeleton, Btn, Sheet, ModalClose, EmptyState } from "@/components/ui";
import { friendlyError, useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/useProfile";
import { calcStreak, setVolume, todayISO } from "@/lib/fitness";
import { projectWeeks, GOAL_LABELS } from "@/lib/recommend";
import { getStreak, type StreakInfo } from "@/lib/streak";
import type { Reminder } from "@/lib/supabase/types";
import { IconBell, IconCamera, IconChart, IconCheck, IconChevronRight, IconDumbbell, IconEdit, IconFlame, IconHome, IconLogout, IconPlan, IconSnow, IconTrash, IconX } from "@/components/icons";

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { profile, targets, loading: profileLoading, refresh } = useProfile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ workouts: 0, volume: 0 });
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [memberSince, setMemberSince] = useState("");

  async function loadExtras() {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const uid = user.user.id;
      if (user.user.created_at) {
        setMemberSince(new Date(user.user.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }));
      }
      const [sessRes, remRes] = await Promise.all([
        supabase.from("workout_sessions").select("date,completed,workout_sets(reps,weight_kg)").eq("user_id", uid),
        supabase.from("reminders").select("*").eq("user_id", uid).eq("enabled", true).order("time_of_day"),
      ]);
      if (sessRes.error) throw sessRes.error;
      const rows = (sessRes.data ?? []) as { date: string; completed: boolean | null; workout_sets: { reps: number | null; weight_kg: number | null }[] }[];
      setStats({
        workouts: rows.filter((r) => r.completed).length,
        volume: rows.reduce((a, r) => a + r.workout_sets.reduce((x, s) => x + setVolume(s.reps, s.weight_kg), 0), 0),
      });
      setStreakInfo(await getStreak(uid));
      setReminders((remRes.data ?? []) as Reminder[]);
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadExtras(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  async function toggleReminder(r: Reminder) {
    setReminders((prev) => prev.filter((x) => x.id !== r.id));
    try {
      const supabase = createClient();
      const { error } = await supabase.from("reminders").delete().eq("id", r.id);
      if (error) throw error;
    } catch (err) {
      toast(friendlyError(err), "error");
      loadExtras();
    }
  }

  const goal = profile?.goal ?? "maintain";
  const projection = profile?.weight_kg && profile?.target_weight_kg ? projectWeeks(profile.weight_kg, profile.target_weight_kg, goal) : null;

  const busy = loading || profileLoading;

  return (
    <div className="min-h-dvh pb-28">
      <div className="page-enter px-5 pt-8">
        <h1 className="text-2xl font-black tracking-tight">Profile</h1>

        {busy ? (
          <div className="mt-4 flex flex-col gap-3"><Skeleton className="h-36" /><Skeleton className="h-24" /></div>
        ) : (
          <>
            {/* identity hero */}
            <Card className="mt-4 !p-5">
              <div className="flex items-center gap-4">
                <div className="pop-in flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-2xl font-black text-black">
                  {(profile?.name ?? "W").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-black">{profile?.name ?? "WEFIT Athlete"}</p>
                  <p className="text-xs text-white/50">
                    Member since {memberSince || "—"} · {GOAL_LABELS[goal] ?? goal}
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <Chip>{profile?.level ?? "intermediate"}</Chip>
                    <Chip>{profile?.training_mode === "home" ? "Home" : "Gym"}</Chip>
                  </div>
                </div>
                <button onClick={() => setEditOpen(true)} className="btn-press rounded-full bg-white/10 p-2.5 text-white/70" aria-label="edit profile">
                  <IconEdit width={18} height={18} />
                </button>
              </div>

              {/* animated stat trio */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="pop-in rounded-2xl bg-white/[0.04] py-3.5">
                  <IconFlame width={20} height={20} className="mx-auto text-white" />
                  <p className="mt-1 text-xl font-black tabular-nums">{streakInfo?.streak ?? 0}</p>
                  <p className="text-[10px] font-bold text-white/45">day streak</p>
                </div>
                <div className="pop-in rounded-2xl bg-white/[0.04] py-3.5" style={{ animationDelay: "60ms" }}>
                  <IconDumbbell width={20} height={20} className="mx-auto text-white" />
                  <p className="mt-1 text-xl font-black tabular-nums">{stats.workouts}</p>
                  <p className="text-[10px] font-bold text-white/45">workouts</p>
                </div>
                <div className="pop-in rounded-2xl bg-white/[0.04] py-3.5" style={{ animationDelay: "120ms" }}>
                  <p className="mx-auto text-xl font-black tabular-nums text-white">{(stats.volume / 1000).toFixed(1)}t</p>
                  <p className="mt-1 text-[10px] font-bold text-white/45">volume lifted</p>
                </div>
              </div>

              {streakInfo && streakInfo.freezes > 0 && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-white/50">
                  <IconSnow width={14} height={14} /> {streakInfo.freezes} streak freeze{streakInfo.freezes === 1 ? "" : "s"} banked
                </p>
              )}
            </Card>

            {/* goal projector */}
            {projection && (
              <Card className="mt-3">
                <SectionTitle title="Your trajectory" sub={projection.label} />
                <div className="mt-3 flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-black tabular-nums">{profile?.weight_kg}</p>
                    <p className="text-[10px] text-white/45">now</p>
                  </div>
                  <div className="relative flex-1">
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="proj-animate h-full w-2/3 rounded-full bg-white" />
                    </div>
                    <p className="mt-1 text-center text-[10px] font-bold text-white/45">steady pace · {projection.weeks} weeks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black tabular-nums">{profile?.target_weight_kg}</p>
                    <p className="text-[10px] text-white/45">target</p>
                  </div>
                </div>
              </Card>
            )}

            {/* daily targets */}
            {targets && profile && (
              <Card className="mt-3">
                <SectionTitle title="Daily targets" sub="Tuned to your body and goal" />
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Calories", `${targets.calories} kcal`],
                    ["Protein", `${targets.protein} g`],
                    ["Carbs", `${targets.carbs} g`],
                    ["Fat", `${targets.fat} g`],
                    ["Water", `${(targets.waterMl / 1000).toFixed(1)} L`],
                    ["Body", `${profile.weight_kg ?? "—"} kg · ${profile.height_cm ?? "—"} cm`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3">
                      <span className="text-white/55">{k}</span>
                      <span className="font-extrabold">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* quick links */}
            <div className="mt-3 flex flex-col gap-2">
              <LinkRow href="/progress" icon={<IconCamera width={18} height={18} />} title="Progress photos" sub="Before / after comparison" />
              <LinkRow href="/planner" icon={<IconPlan width={18} height={18} />} title="Today's planner" sub="Your daily tasks" />
            </div>

            {/* reminders */}
            <Card className="mt-3">
              <div className="flex items-center justify-between">
                <SectionTitle title="Reminders" sub="In-app nudges for training & meals" />
                <button onClick={() => setReminderOpen(true)} className="btn-press rounded-full bg-white px-4 py-2 text-xs font-black text-black">+ Add</button>
              </div>
              {reminders.length === 0 ? (
                <p className="mt-2 text-sm text-white/40">No reminders yet. Add one for your workout hour.</p>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  {reminders.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
                      <IconBell width={17} height={17} className="text-white/60" />
                      <div className="flex-1">
                        <p className="text-sm font-extrabold">{r.title}</p>
                        <p className="text-[11px] text-white/45 capitalize">{r.time_of_day.slice(0, 5)} · {r.kind}</p>
                      </div>
                      <button onClick={() => toggleReminder(r)} className="btn-press p-2 text-white/30" aria-label="delete reminder">
                        <IconTrash width={16} height={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <button
              onClick={logout}
              className="btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] py-4 font-extrabold text-white/70"
            >
              <IconLogout width={20} height={20} /> Log out
            </button>

            <p className="mt-6 text-center text-xs text-white/25">WEFIT · {todayISO()}</p>
          </>
        )}
      </div>

      {editOpen && profile && (
        <EditProfileSheet profileId={profile.id} initial={profile} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); refresh(); loadExtras(); }} />
      )}
      {reminderOpen && (
        <ReminderSheet onClose={() => setReminderOpen(false)} onSaved={() => { setReminderOpen(false); loadExtras(); }} />
      )}
      <TabBar />
    </div>
  );
}

function LinkRow({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="card-press flex items-center gap-3 rounded-2xl border border-white/10 bg-card p-3.5">
      <span className="text-white/70">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-extrabold">{title}</span>
        <span className="block text-[11px] text-white/45">{sub}</span>
      </span>
      <IconChevronRight width={18} height={18} className="text-white/30" />
    </Link>
  );
}

/* ---------- edit profile sheet ---------- */
function EditProfileSheet({
  profileId, initial, onClose, onSaved,
}: {
  profileId: string;
  initial: NonNullable<ReturnType<typeof useProfile>["profile"]>;
  onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(initial.name ?? "");
  const [age, setAge] = useState(String(initial.age ?? ""));
  const [height, setHeight] = useState(String(initial.height_cm ?? ""));
  const [weight, setWeight] = useState(String(initial.weight_kg ?? ""));
  const [targetWeight, setTargetWeight] = useState(String(initial.target_weight_kg ?? ""));
  const [goal, setGoal] = useState<"lose" | "maintain" | "gain">(initial.goal ?? "maintain");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">(initial.level ?? "intermediate");
  const [mode, setMode] = useState<"home" | "gym">(initial.training_mode ?? "gym");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({
        name: name.trim() || null,
        age: age ? Number(age) : null,
        height_cm: height ? Number(height) : null,
        weight_kg: weight ? Number(weight) : null,
        target_weight_kg: targetWeight ? Number(targetWeight) : null,
        goal, level, training_mode: mode,
      }).eq("id", profileId);
      if (error) throw error;
      toast("Profile updated", "success");
      onSaved();
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setSaving(false);
    }
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">{label}</label>
      {children}
    </div>
  );
  const OptRow = <T extends string>({ options, value, onPick }: { options: T[]; value: T; onPick: (v: T) => void }) => (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button key={o} onClick={() => onPick(o)} className={`btn-press rounded-2xl border py-3 text-sm font-bold capitalize ${value === o ? "border-white bg-white text-black" : "border-white/12 text-white/55"}`}>
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Edit profile</h2>
        <ModalClose onClose={onClose} />
      </div>
      <div className="mt-4 flex max-h-[62dvh] flex-col gap-4 overflow-y-auto pb-2">
        <Field label="Name"><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age"><input type="number" className="field" value={age} onChange={(e) => setAge(e.target.value)} /></Field>
          <Field label="Height (cm)"><input type="number" className="field" value={height} onChange={(e) => setHeight(e.target.value)} /></Field>
          <Field label="Weight (kg)"><input type="number" step="0.1" className="field" value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
          <Field label="Target weight (kg)"><input type="number" step="0.1" className="field" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="Optional" /></Field>
        </div>
        <Field label="Goal"><OptRow options={["lose", "maintain", "gain"]} value={goal} onPick={setGoal} /></Field>
        <Field label="Experience level"><OptRow options={["beginner", "intermediate", "advanced"]} value={level} onPick={setLevel} /></Field>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Training mode</label>
          <div className="grid grid-cols-2 gap-2">
            {([["home", "Home"], ["gym", "Gym"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setMode(v)} className={`btn-press rounded-2xl border py-3 text-sm font-bold ${mode === v ? "border-white bg-white text-black" : "border-white/12 text-white/55"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Btn onClick={save} disabled={saving} className="mt-4 w-full">{saving ? "Saving…" : "Save changes"}</Btn>
    </Sheet>
  );
}

/* ---------- reminder sheet ---------- */
function ReminderSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("18:00");
  const [kind, setKind] = useState<Reminder["kind"]>("workout");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) { toast("Give the reminder a title.", "error"); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { error } = await supabase.from("reminders").insert({
        user_id: user.user.id, title: title.trim(), time_of_day: time, kind, enabled: true,
      });
      if (error) throw error;
      toast("Reminder added", "success");
      onSaved();
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black">New reminder</h3>
        <ModalClose onClose={onClose} />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <input className="field" placeholder="e.g. Evening workout" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Time</label>
            <input type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Type</label>
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value as Reminder["kind"])}>
              <option value="workout">Workout</option>
              <option value="meal">Meal</option>
              <option value="water">Water</option>
              <option value="sleep">Sleep</option>
              <option value="habit">Habit</option>
            </select>
          </div>
        </div>
        <Btn onClick={save} disabled={busy} className="w-full">{busy ? "Adding…" : "Add reminder"}</Btn>
      </div>
    </Sheet>
  );
}
