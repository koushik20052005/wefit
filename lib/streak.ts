import { createClient } from "./supabase/client";
import { todayISO } from "./fitness";

/** All dates (ISO) with any activity: check-in, workout, food log, water, or completed task. */
export async function getActivityDates(uid: string): Promise<string[]> {
  const supabase = createClient();
  const [ci, ws, fl, wl, dt] = await Promise.all([
    supabase.from("checkins").select("checkin_date").eq("user_id", uid),
    supabase.from("workout_sessions").select("date").eq("user_id", uid),
    supabase.from("food_logs").select("date").eq("user_id", uid),
    supabase.from("water_logs").select("date").eq("user_id", uid),
    supabase.from("day_tasks").select("task_date").eq("user_id", uid).eq("is_done", true),
  ]);
  const set = new Set<string>();
  const push = (rows: unknown[] | null, key: string) => {
    for (const r of rows ?? []) {
      const v = (r as Record<string, string>)[key];
      if (v) set.add(v.slice(0, 10));
    }
  };
  push(ci.data, "checkin_date");
  push(ws.data, "date");
  push(fl.data, "date");
  push(wl.data, "date");
  push(dt.data, "task_date");
  return [...set].sort().reverse();
}

export async function getFreezes(uid: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("streak_freezes")
    .select("*")
    .eq("user_id", uid)
    .order("earned_at", { ascending: false });
  return (data ?? []) as { id: string; used_for_date: string | null }[];
}

/**
 * Streak counting back from today. A missing day can be bridged by an
 * unused freeze (returned as `yesterdayMissed` so UI can offer it).
 */
export function calcStreak(dates: string[], freezeUsedDates: string[]) {
  const days = new Set(dates);
  const frozen = new Set(freezeUsedDates.filter(Boolean));
  let streak = 0;
  const cursor = new Date();
  const today = todayISO(cursor);
  let yesterdayMissed = false;

  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const iso = todayISO(cursor);
    if (days.has(iso)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (frozen.has(iso)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    // first gap: is it yesterday and still rescuable?
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (iso === todayISO(y) && !days.has(today)) yesterdayMissed = true;
    break;
  }
  return { streak, yesterdayMissed, activeToday: days.has(today) };
}

/** Award 1 freeze per 7-day streak milestone, if not already granted. */
export async function awardFreezes(uid: string, streak: number) {
  const earned = Math.floor(streak / 7);
  if (earned <= 0) return 0;
  const supabase = createClient();
  const { count } = await supabase
    .from("streak_freezes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid);
  const missing = earned - (count ?? 0);
  if (missing <= 0) return 0;
  const rows = Array.from({ length: missing }, () => ({ user_id: uid }));
  const { error } = await supabase.from("streak_freezes").insert(rows);
  return error ? 0 : missing;
}

export async function useFreeze(uid: string, dateIso: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("streak_freezes")
    .select("id")
    .eq("user_id", uid)
    .is("used_for_date", null)
    .order("earned_at", { ascending: true })
    .limit(1)
    .single();
  if (!data) return false;
  const { error } = await supabase
    .from("streak_freezes")
    .update({ used_for_date: dateIso })
    .eq("id", (data as { id: string }).id);
  return !error;
}

export async function claimCheckin(uid: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("checkins")
    .upsert({ user_id: uid, checkin_date: todayISO() }, { onConflict: "user_id,checkin_date" });
  return !error;
}

export interface StreakInfo {
  streak: number;
  freezes: number;
  activeToday: boolean;
  yesterdayMissed: boolean;
}

/** Combined streak snapshot: activity dates + freezes + streak math. */
export async function getStreak(uid: string): Promise<StreakInfo> {
  const dates = await getActivityDates(uid);
  const freezes = await getFreezes(uid);
  const used = freezes.map((f) => f.used_for_date).filter(Boolean) as string[];
  const { streak, yesterdayMissed, activeToday } = calcStreak(dates, used);
  return {
    streak,
    freezes: freezes.filter((f) => !f.used_for_date).length,
    activeToday,
    yesterdayMissed,
  };
}
