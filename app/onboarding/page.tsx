"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyError, useToast } from "@/components/Toast";
import { calcTargets } from "@/lib/fitness";
import type { ActivityLevel, Goal } from "@/lib/supabase/types";
import { IconCheck } from "@/components/icons";

const GOALS: { id: Goal; label: string; desc: string }[] = [
  { id: "lose", label: "Lose fat", desc: "Cut with a smart deficit" },
  { id: "maintain", label: "Stay fit", desc: "Eat at maintenance" },
  { id: "gain", label: "Build muscle", desc: "Lean bulk surplus" },
];

const ACTIVITY: { id: ActivityLevel; label: string }[] = [
  { id: "sedentary", label: "Sedentary" },
  { id: "light", label: "Light" },
  { id: "moderate", label: "Moderate" },
  { id: "active", label: "Active" },
  { id: "athlete", label: "Athlete" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [busy, setBusy] = useState(false);

  const h = Number(height), w = Number(weight), a = Number(age);
  const preview =
    h > 0 && w > 0 && a > 0
      ? calcTargets({ weight_kg: w, height_cm: h, age: a, gender, activity_level: activity, goal })
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !a || !h || !w) {
      toast("Fill in your name, age, height and weight.", "error");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in.");
      const { error } = await supabase.from("profiles").upsert({
        id: user.user.id,
        name: name.trim(),
        age: a,
        gender,
        height_cm: h,
        weight_kg: w,
        goal,
        activity_level: activity,
      });
      if (error) throw error;
      toast("Profile ready. Let's go!", "success");
      router.replace("/home");
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-enter min-h-dvh px-6 pb-10 pt-10">
      <h1 className="text-2xl font-black">Set up your profile</h1>
      <p className="mt-1 text-sm text-white/55">We use this to compute your daily targets.</p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Name</label>
          <input className="field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Age</label>
            <input type="number" className="field" placeholder="21" value={age} onChange={(e) => setAge(e.target.value)} min={10} max={100} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Height (cm)</label>
            <input type="number" className="field" placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} min={100} max={250} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Weight (kg)</label>
            <input type="number" className="field" placeholder="70" value={weight} onChange={(e) => setWeight(e.target.value)} min={30} max={250} step="0.1" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Gender</label>
          <div className="grid grid-cols-3 gap-2">
            {(["male", "female", "other"] as const).map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => setGender(g)}
                className={`btn-press rounded-2xl border py-3 text-sm font-bold capitalize transition-all ${
                  gender === g ? "border-lime bg-lime/15 text-lime" : "border-white/10 bg-card text-white/55"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Your goal</label>
          <div className="flex flex-col gap-2">
            {GOALS.map((g) => (
              <button
                type="button"
                key={g.id}
                onClick={() => setGoal(g.id)}
                className={`btn-press flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                  goal === g.id ? "border-lime bg-lime/10" : "border-white/10 bg-card"
                }`}
              >
                <span>
                  <span className={`block font-bold ${goal === g.id ? "text-lime" : "text-white"}`}>{g.label}</span>
                  <span className="block text-xs text-white/50">{g.desc}</span>
                </span>
                {goal === g.id && <IconCheck className="text-lime" width={20} height={20} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">Activity level</label>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY.map((x) => (
              <button
                type="button"
                key={x.id}
                onClick={() => setActivity(x.id)}
                className={`btn-press rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                  activity === x.id ? "border-lime bg-lime/15 text-lime" : "border-white/10 bg-card text-white/55"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>

        {preview && (
          <div className="rounded-2xl border border-lime/25 bg-lime/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-lime">Your daily targets</p>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              {[
                [preview.calories, "kcal"],
                [preview.protein, "protein g"],
                [preview.carbs, "carbs g"],
                [preview.fat, "fat g"],
              ].map(([v, l]) => (
                <div key={l as string}>
                  <p className="text-lg font-extrabold text-white">{v}</p>
                  <p className="text-[10px] text-white/50">{l}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-press rounded-2xl bg-gradient-to-r from-lime to-cy py-4 text-base font-extrabold text-ink shadow-[0_8px_30px_rgba(163,230,53,0.3)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Start my journey"}
        </button>
      </form>
    </div>
  );
}
