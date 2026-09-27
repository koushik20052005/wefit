"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyError, useToast } from "@/components/Toast";
import { calcTargets } from "@/lib/fitness";
import type { ActivityLevel, Goal, PlanLevel, TrainingMode } from "@/lib/supabase/types";
import { IconCheck } from "@/components/icons";
import Logo from "@/components/Logo";

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

const LEVELS: { id: PlanLevel; label: string; desc: string }[] = [
  { id: "beginner", label: "Beginner", desc: "New to training" },
  { id: "intermediate", label: "Intermediate", desc: "6+ months consistent" },
  { id: "advanced", label: "Advanced", desc: "2+ years lifting" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [level, setLevel] = useState<PlanLevel>("beginner");
  const [mode, setMode] = useState<TrainingMode>("gym");
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
        target_weight_kg: targetWeight ? Number(targetWeight) : null,
        goal,
        activity_level: activity,
        level,
        training_mode: mode,
      });
      if (error) throw error;
      if (typeof window !== "undefined") {
        localStorage.setItem("wefit-level", level);
        localStorage.setItem("wefit-mode", mode);
      }
      toast("Profile ready. Let's go!", "success");
      router.replace("/home");
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  const pickBtn = (on: boolean) =>
    `btn-press rounded-2xl border py-3 text-sm font-bold capitalize transition-all ${
      on ? "border-white bg-white text-black" : "border-white/12 bg-card text-white/55"
    }`;

  return (
    <div className="page-enter min-h-dvh px-6 pb-10 pt-10">
      <Logo size={40} />
      <h1 className="mt-4 text-2xl font-black tracking-tight">Set up your profile</h1>
      <p className="mt-1 text-sm text-white/55">We use this to build your workouts, diet and targets.</p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Name</label>
          <input className="field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Age</label>
            <input type="number" className="field" placeholder="21" value={age} onChange={(e) => setAge(e.target.value)} min={10} max={100} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Gender</label>
            <select className="field capitalize" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Height (cm)</label>
            <input type="number" className="field" placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} min={100} max={250} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Weight (kg)</label>
            <input type="number" className="field" placeholder="70" value={weight} onChange={(e) => setWeight(e.target.value)} min={30} max={250} step="0.1" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">
            Target weight (kg) <span className="normal-case text-white/30">· optional</span>
          </label>
          <input type="number" className="field" placeholder="e.g. 68" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} min={30} max={250} step="0.1" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Your goal</label>
          <div className="flex flex-col gap-2">
            {GOALS.map((g) => (
              <button
                type="button"
                key={g.id}
                onClick={() => setGoal(g.id)}
                className={`btn-press flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                  goal === g.id ? "border-white bg-white/[0.07]" : "border-white/10 bg-card"
                }`}
              >
                <span>
                  <span className="block font-bold">{g.label}</span>
                  <span className="block text-xs text-white/50">{g.desc}</span>
                </span>
                {goal === g.id && <IconCheck width={20} height={20} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Experience level</label>
          <div className="flex flex-col gap-2">
            {LEVELS.map((l) => (
              <button
                type="button"
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={`btn-press flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                  level === l.id ? "border-white bg-white/[0.07]" : "border-white/10 bg-card"
                }`}
              >
                <span>
                  <span className="block font-bold">{l.label}</span>
                  <span className="block text-xs text-white/50">{l.desc}</span>
                </span>
                {level === l.id && <IconCheck width={20} height={20} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Where do you train?</label>
          <div className="grid grid-cols-2 gap-2">
            {(["gym", "home"] as TrainingMode[]).map((m) => (
              <button type="button" key={m} onClick={() => setMode(m)} className={pickBtn(mode === m)}>
                {m === "gym" ? "Gym" : "Home"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Activity level</label>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY.map((x) => (
              <button
                type="button"
                key={x.id}
                onClick={() => setActivity(x.id)}
                className={`btn-press rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                  activity === x.id ? "border-white bg-white text-black" : "border-white/12 bg-card text-white/55"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>

        {preview && (
          <div className="pop-in rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">Your daily targets</p>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              {[
                [preview.calories, "kcal"],
                [preview.protein, "protein g"],
                [preview.carbs, "carbs g"],
                [preview.fat, "fat g"],
              ].map(([v, l]) => (
                <div key={l as string}>
                  <p className="text-lg font-extrabold tabular-nums">{v}</p>
                  <p className="text-[10px] text-white/50">{l}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-press rounded-2xl bg-white py-4 text-base font-black text-black shadow-[0_8px_30px_rgba(255,255,255,0.15)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Start my journey"}
        </button>
      </form>
    </div>
  );
}
