import type { ActivityLevel, DayTargets, Goal } from "./supabase/types";

const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export interface BodyStats {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: "male" | "female" | "other";
  activity_level: ActivityLevel;
  goal: Goal;
}

/** Mifflin-St Jeor BMR x activity multiplier, adjusted for goal. Protein 1.8g/kg. */
export function calcTargets(s: BodyStats): DayTargets {
  const bmr =
    s.gender === "female"
      ? 10 * s.weight_kg + 6.25 * s.height_cm - 5 * s.age - 161
      : 10 * s.weight_kg + 6.25 * s.height_cm - 5 * s.age + 5;
  let calories = Math.round(bmr * ACTIVITY_MULT[s.activity_level]);
  if (s.goal === "lose") calories -= 400;
  if (s.goal === "gain") calories += 300;
  const protein = Math.round(1.8 * s.weight_kg);
  const fat = Math.max(30, Math.round((calories * 0.25) / 9));
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat, waterMl: 3000 };
}

export function todayISO(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function startOfWeekISO(d = new Date()): string {
  const c = new Date(d);
  const day = (c.getDay() + 6) % 7; // Monday = 0
  c.setDate(c.getDate() - day);
  return c.toISOString().slice(0, 10);
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function formatDateLong(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Consecutive-day streak ending today (or yesterday) from a sorted desc list of ISO dates. */
export function calcStreak(dateIsos: string[]): number {
  const days = new Set(dateIsos);
  let streak = 0;
  const cursor = new Date();
  if (!days.has(todayISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(todayISO(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function setVolume(reps: number | null, weight: number | null): number {
  return (reps ?? 0) * (weight ?? 0);
}
