"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import { Skeleton } from "@/components/CountUp";
import { friendlyError, useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/useProfile";
import { calcStreak, setVolume, todayISO } from "@/lib/fitness";
import { IconDumbbell, IconEdit, IconFlame, IconLogout, IconX } from "@/components/icons";

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { profile, targets, loading: profileLoading, refresh } = useProfile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ workouts: 0, volume: 0, streak: 0 });
  const [editOpen, setEditOpen] = useState(false);
  const [memberSince, setMemberSince] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;
        if (user.user.created_at) {
          setMemberSince(new Date(user.user.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }));
        }
        const { data, error } = await supabase
          .from("workout_sessions")
          .select("date,completed,workout_sets(reps,weight_kg)")
          .eq("user_id", user.user.id);
        if (error) throw error;
        const rows = (data ?? []) as { date: string; completed: boolean | null; workout_sets: { reps: number | null; weight_kg: number | null }[] }[];
        setStats({
          workouts: rows.filter((r) => r.completed).length,
          volume: rows.reduce((a, r) => a + r.workout_sets.reduce((x, s) => x + setVolume(s.reps, s.weight_kg), 0), 0),
          streak: calcStreak(rows.map((r) => r.date)),
        });
      } catch (err) {
        toast(friendlyError(err), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  const busy = loading || profileLoading;

  return (
    <div className="min-h-dvh pb-28">
      <div className="page-enter px-5 pt-8">
        <h1 className="text-2xl font-black">Profile</h1>

        {busy ? (
          <div className="mt-4 flex flex-col gap-3"><Skeleton className="h-32" /><Skeleton className="h-24" /></div>
        ) : (
          <>
            <div className="mt-4 rounded-3xl bg-card p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-lime to-cy text-2xl font-black text-ink">
                  {(profile?.name ?? "W").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-black">{profile?.name ?? "Wefit Athlete"}</p>
                  <p className="text-xs text-white/50">
                    Member since {memberSince || "—"}
                    {profile?.goal ? ` · Goal: ${profile.goal === "lose" ? "Lose fat" : profile.goal === "gain" ? "Build muscle" : "Stay fit"}` : ""}
                  </p>
                </div>
                <button onClick={() => setEditOpen(true)} className="btn-press rounded-full bg-white/10 p-2.5 text-white/70" aria-label="edit profile">
                  <IconEdit width={18} height={18} />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-white/5 py-3">
                  <IconDumbbell width={18} height={18} className="mx-auto text-lime" />
                  <p className="mt-1 text-lg font-extrabold">{stats.workouts}</p>
                  <p className="text-[10px] text-white/50">workouts</p>
                </div>
                <div className="rounded-2xl bg-white/5 py-3">
                  <IconFlame width={18} height={18} className="mx-auto text-orange-400" />
                  <p className="mt-1 text-lg font-extrabold">{stats.streak}</p>
                  <p className="text-[10px] text-white/50">day streak</p>
                </div>
                <div className="rounded-2xl bg-white/5 py-3">
                  <p className="mx-auto text-lg font-extrabold text-cy">{(stats.volume / 1000).toFixed(1)}t</p>
                  <p className="mt-1 text-lg font-extrabold opacity-0">.</p>
                  <p className="-mt-5 text-[10px] text-white/50">total volume</p>
                </div>
              </div>
            </div>

            {targets && profile && (
              <div className="mt-4 rounded-3xl bg-card p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-white/45">Daily targets</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Calories", `${targets.calories} kcal`],
                    ["Protein", `${targets.protein} g`],
                    ["Carbs", `${targets.carbs} g`],
                    ["Fat", `${targets.fat} g`],
                    ["Water", `${(targets.waterMl / 1000).toFixed(1)} L`],
                    ["Body", `${profile.weight_kg ?? "—"} kg · ${profile.height_cm ?? "—"} cm`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                      <span className="text-white/55">{k}</span>
                      <span className="font-extrabold text-lime">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={logout}
              className="btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-4 font-extrabold text-red-400"
            >
              <IconLogout width={20} height={20} /> Log out
            </button>

            <p className="mt-6 text-center text-xs text-white/30">WEFIT v1.0 · {todayISO()}</p>
          </>
        )}
      </div>

      {editOpen && profile && (
        <EditProfileForm
          profileId={profile.id}
          initial={profile}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            refresh();
          }}
        />
      )}
      <TabBar />
    </div>
  );
}

function EditProfileForm({
  profileId,
  initial,
  onClose,
  onSaved,
}: {
  profileId: string;
  initial: NonNullable<ReturnType<typeof useProfile>["profile"]>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(initial.name ?? "");
  const [age, setAge] = useState(String(initial.age ?? ""));
  const [height, setHeight] = useState(String(initial.height_cm ?? ""));
  const [weight, setWeight] = useState(String(initial.weight_kg ?? ""));
  const [goal, setGoal] = useState<"lose" | "maintain" | "gain">(initial.goal ?? "maintain");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          name: name.trim() || null,
          age: age ? Number(age) : null,
          height_cm: height ? Number(height) : null,
          weight_kg: weight ? Number(weight) : null,
          goal,
        })
        .eq("id", profileId);
      if (error) throw error;
      toast("Profile updated", "success");
      onSaved();
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fade-in fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="modal-in w-full max-w-[430px] rounded-t-[2rem] bg-card p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">Edit profile</h2>
          <button onClick={onClose} className="btn-press rounded-full bg-white/10 p-2" aria-label="close">
            <IconX width={18} height={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Name</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Age</label>
              <input type="number" className="field" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Height cm</label>
              <input type="number" className="field" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Weight kg</label>
              <input type="number" step="0.1" className="field" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Goal</label>
            <div className="grid grid-cols-3 gap-2">
              {(["lose", "maintain", "gain"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`btn-press rounded-2xl border py-3 text-sm font-bold capitalize ${goal === g ? "border-lime bg-lime/15 text-lime" : "border-white/10 text-white/55"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="btn-press mt-4 w-full rounded-2xl bg-gradient-to-r from-lime to-cy py-4 font-extrabold text-ink disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
