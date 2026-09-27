"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TabBar from "@/components/TabBar";
import ProgressRing from "@/components/ProgressRing";
import CountUp, { Skeleton } from "@/components/CountUp";
import { friendlyError, useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/useProfile";
import { todayISO } from "@/lib/fitness";
import type { FoodItem, FoodLog, MealType } from "@/lib/supabase/types";
import { IconDrop, IconFood, IconPlus, IconSearch, IconTrash, IconX } from "@/components/icons";

const MEALS: { id: MealType; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "snacks", label: "Snacks" },
  { id: "dinner", label: "Dinner" },
];

export default function DietPage() {
  const { toast } = useToast();
  const { targets, loading: profileLoading } = useProfile();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [water, setWater] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const totals = useMemo(
    () => ({
      cal: logs.reduce((a, l) => a + Number(l.calories), 0),
      protein: logs.reduce((a, l) => a + Number(l.protein), 0),
      carbs: logs.reduce((a, l) => a + Number(l.carbs), 0),
      fat: logs.reduce((a, l) => a + Number(l.fat), 0),
    }),
    [logs]
  );

  async function load() {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const uid = user.user.id;
      const today = todayISO();
      const [foodRes, waterRes] = await Promise.all([
        supabase.from("food_logs").select("*").eq("user_id", uid).eq("date", today).order("created_at", { ascending: false }),
        supabase.from("water_logs").select("ml").eq("user_id", uid).eq("date", today),
      ]);
      if (foodRes.error) throw foodRes.error;
      if (waterRes.error) throw waterRes.error;
      setLogs((foodRes.data ?? []) as FoodLog[]);
      setWater((waterRes.data ?? []).reduce((a, w) => a + Number(w.ml), 0));
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

  async function addWater(ml: number) {
    setWater((w) => w + ml);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { error } = await supabase.from("water_logs").insert({ user_id: user.user.id, date: todayISO(), ml });
      if (error) throw error;
    } catch (err) {
      toast(friendlyError(err), "error");
      setWater((w) => w - ml);
    }
  }

  async function deleteLog(id: string) {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    try {
      const supabase = createClient();
      const { error } = await supabase.from("food_logs").delete().eq("id", id);
      if (error) throw error;
      toast("Entry removed", "info");
    } catch (err) {
      toast(friendlyError(err), "error");
      load();
    }
  }

  const t = targets ?? { calories: 2200, protein: 130, carbs: 250, fat: 60, waterMl: 3000 };
  const waterPct = Math.min(100, (water / t.waterMl) * 100);
  const busy = loading || profileLoading;

  return (
    <div className="min-h-dvh pb-28">
      <div className="page-enter px-5 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">Diet</h1>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-press flex items-center gap-1.5 rounded-full bg-gradient-to-r from-lime to-cy px-4 py-2.5 text-sm font-extrabold text-ink"
          >
            <IconPlus width={16} height={16} /> Add food
          </button>
        </div>

        {busy ? (
          <div className="mt-4 flex flex-col gap-3"><Skeleton className="h-44" /><Skeleton className="h-32" /></div>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-5 rounded-3xl bg-card p-5">
              <ProgressRing
                size={128}
                stroke={12}
                progress={t.calories ? totals.cal / t.calories : 0}
                color="#A3E635"
                label={<CountUp value={Math.round(totals.cal)} />}
                sublabel={`of ${t.calories} kcal`}
              />
              <div className="flex flex-1 flex-col gap-3">
                <MacroBar label="Protein" cur={totals.protein} target={t.protein} color="#A3E635" unit="g" />
                <MacroBar label="Carbs" cur={totals.carbs} target={t.carbs} color="#22D3EE" unit="g" />
                <MacroBar label="Fat" cur={totals.fat} target={t.fat} color="#F59E0B" unit="g" />
              </div>
            </div>

            <div className="mt-4 rounded-3xl bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconDrop width={18} height={18} className="text-cy" />
                  <p className="font-extrabold">Water</p>
                </div>
                <p className="text-sm font-bold text-white/60">
                  {(water / 1000).toFixed(1)}L <span className="text-white/35">/ {(t.waterMl / 1000).toFixed(0)}L</span>
                </p>
              </div>
              <div className="mt-3 h-24 overflow-hidden rounded-2xl bg-white/5">
                <div className="flex h-full items-end justify-center">
                  <div className="water-fill w-full rounded-t-xl bg-gradient-to-t from-cy/70 to-cy/30" style={{ height: `${waterPct}%` }} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[250, 500].map((ml) => (
                  <button key={ml} onClick={() => addWater(ml)} className="btn-press rounded-2xl bg-white/5 py-3 text-sm font-extrabold text-cy">
                    +{ml} ml
                  </button>
                ))}
              </div>
            </div>

            {MEALS.map((m) => {
              const items = logs.filter((l) => l.meal_type === m.id);
              if (items.length === 0) return null;
              const mealCal = items.reduce((a, l) => a + Number(l.calories), 0);
              return (
                <div key={m.id} className="mt-4">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-sm font-extrabold uppercase tracking-wider text-white/60">{m.label}</p>
                    <p className="text-xs font-bold text-white/40">{Math.round(mealCal)} kcal</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.map((l) => (
                      <div key={l.id} className="flex items-center justify-between rounded-2xl bg-card p-4">
                        <div>
                          <p className="font-bold">{l.custom_name ?? "Food"}</p>
                          <p className="text-xs text-white/50">
                            {l.quantity_grams}g · P {Math.round(Number(l.protein))}g · C {Math.round(Number(l.carbs))}g · F {Math.round(Number(l.fat))}g
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-extrabold text-lime">{Math.round(Number(l.calories))}</p>
                          <button onClick={() => deleteLog(l.id)} className="btn-press text-white/30" aria-label="delete entry">
                            <IconTrash width={18} height={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {logs.length === 0 && (
              <div className="mt-6 rounded-3xl bg-card p-8 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-cy/15 text-cy">
                  <IconFood width={28} height={28} />
                </div>
                <p className="font-extrabold">Nothing logged yet today</p>
                <p className="mt-1 text-sm text-white/50">Search 1200+ Indian dishes and log your first meal.</p>
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && <AddFoodModal onClose={() => setModalOpen(false)} onLogged={load} />}
      <TabBar />
    </div>
  );
}

function MacroBar({ label, cur, target, color, unit }: { label: string; cur: number; target: number; color: string; unit: string }) {
  const pct = target ? Math.min(100, (cur / target) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-bold text-white/60">{label}</span>
        <span className="font-bold text-white/80">{Math.round(cur)}/{target}{unit}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function AddFoodModal({ onClose, onLogged }: { onClose: () => void; onLogged: () => void }) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState("100");
  const [servings, setServings] = useState(1);
  const [mode, setMode] = useState<"grams" | "servings">("grams");
  const [meal, setMeal] = useState<MealType>("lunch");
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("food_items")
          .select("*")
          .ilike("name", `%${query.trim()}%`)
          .limit(20);
        if (error) throw error;
        setResults((data ?? []) as FoodItem[]);
      } catch (err) {
        toast(friendlyError(err), "error");
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, toast]);

  const qtyGrams = selected
    ? mode === "grams"
      ? Math.max(0, Number(grams) || 0)
      : Math.max(0, servings * (Number(selected.serving_grams) || 100))
    : 0;
  const factor = qtyGrams / 100;
  const macros = selected
    ? {
        cal: Math.round(Number(selected.calories_per_100g) * factor),
        protein: Math.round(Number(selected.protein_per_100g) * factor * 10) / 10,
        carbs: Math.round(Number(selected.carbs_per_100g) * factor * 10) / 10,
        fat: Math.round(Number(selected.fat_per_100g) * factor * 10) / 10,
      }
    : null;

  async function log() {
    if (!selected || qtyGrams <= 0 || !macros) {
      toast("Pick a food and enter a quantity.", "error");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in.");
      const { error } = await supabase.from("food_logs").insert({
        user_id: user.user.id,
        date: todayISO(),
        meal_type: meal,
        food_item_id: selected.id,
        custom_name: selected.name,
        quantity_grams: Math.round(qtyGrams),
        calories: macros.cal,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      });
      if (error) throw error;
      toast(`${selected.name} logged`, "success");
      onLogged();
      onClose();
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fade-in fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="modal-in flex max-h-[88dvh] w-full max-w-[430px] flex-col rounded-t-[2rem] bg-card p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">Add food</h2>
          <button onClick={onClose} className="btn-press rounded-full bg-white/10 p-2" aria-label="close">
            <IconX width={18} height={18} />
          </button>
        </div>

        {!selected ? (
          <>
            <div className="relative">
              <IconSearch width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                autoFocus
                className="field !pl-11"
                placeholder="Search… try 'upma', 'biryani', 'egg'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="mt-3 flex-1 overflow-y-auto">
              {searching && <p className="py-4 text-center text-sm text-white/40">Searching…</p>}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="py-4 text-center text-sm text-white/40">No matches. Try another spelling.</p>
              )}
              {results.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelected(f)}
                  className="btn-press flex w-full items-center justify-between border-b border-white/5 py-3 text-left"
                >
                  <div>
                    <p className="font-bold">{f.name}</p>
                    <p className="text-xs text-white/45">
                      {f.category}{f.serving_desc ? ` · ${f.serving_desc}` : ""} · {f.calories_per_100g} kcal/100g
                    </p>
                  </div>
                  <IconPlus width={20} height={20} className="shrink-0 text-lime" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="overflow-y-auto">
            <button onClick={() => setSelected(null)} className="btn-press mb-3 text-sm font-bold text-cy">
              ← Change food
            </button>
            <p className="text-lg font-black">{selected.name}</p>
            <p className="text-xs text-white/50">
              {selected.calories_per_100g} kcal · P {selected.protein_per_100g}g · C {selected.carbs_per_100g}g · F {selected.fat_per_100g}g per 100g
            </p>

            <div className="mt-4 grid grid-cols-2 rounded-2xl bg-white/5 p-1.5">
              {(["grams", "servings"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`btn-press rounded-xl py-2 text-sm font-bold capitalize ${mode === m ? "bg-lime/20 text-lime" : "text-white/50"}`}
                >
                  {m}
                </button>
              ))}
            </div>

            {mode === "grams" ? (
              <input
                type="number"
                className="field mt-3"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                placeholder="Grams"
                min={1}
              />
            ) : (
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/5 p-3">
                <button onClick={() => setServings((s) => Math.max(0.5, s - 0.5))} className="btn-press rounded-xl bg-white/10 px-4 py-2 font-black">−</button>
                <div className="text-center">
                  <p className="text-xl font-black">{servings}</p>
                  <p className="text-xs text-white/50">{selected.serving_desc ?? "serving"}</p>
                </div>
                <button onClick={() => setServings((s) => s + 0.5)} className="btn-press rounded-xl bg-white/10 px-4 py-2 font-black">+</button>
              </div>
            )}

            <div className="mt-4 grid grid-cols-4 gap-2">
              {(["breakfast", "lunch", "snacks", "dinner"] as MealType[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMeal(m)}
                  className={`btn-press rounded-xl border py-2.5 text-xs font-bold capitalize ${meal === m ? "border-lime bg-lime/15 text-lime" : "border-white/10 text-white/50"}`}
                >
                  {m}
                </button>
              ))}
            </div>

            {macros && (
              <div className="mt-4 rounded-2xl bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white/60">{Math.round(qtyGrams)}g total</p>
                  <p className="text-xl font-black text-lime">{macros.cal} kcal</p>
                </div>
                <p className="mt-1 text-xs text-white/50">
                  Protein {macros.protein}g · Carbs {macros.carbs}g · Fat {macros.fat}g
                </p>
              </div>
            )}

            <button
              onClick={log}
              disabled={saving}
              className="btn-press mt-4 w-full rounded-2xl bg-gradient-to-r from-lime to-cy py-4 font-extrabold text-ink disabled:opacity-50"
            >
              {saving ? "Logging…" : "Log food"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
