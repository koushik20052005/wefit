"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TabBar from "@/components/TabBar";
import Ring from "@/components/Ring";
import { Card, SectionTitle, Chip, Skeleton, Btn, Sheet, ProgressBar, Tile, ModalClose, EmptyState } from "@/components/ui";
import { fireConfetti } from "@/components/Confetti";
import { friendlyError, useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/useProfile";
import { todayISO } from "@/lib/fitness";
import { getBreakfastSpotlight, getDietPlan, mealMacros, MEAL_LABELS, MEDICAL_DISCLAIMER, type MealSuggestion } from "@/lib/recommend";
import type { CustomFood, FoodItem, FoodLog, MealType } from "@/lib/supabase/types";
import { IconBolt, IconCheck, IconDrop, IconFood, IconPlus, IconSearch, IconTrash, IconX } from "@/components/icons";

const MEALS: MealType[] = ["breakfast", "lunch", "snacks", "dinner"];
type Tab = "log" | "recommended" | "mine";

export default function DietPage() {
  const { toast } = useToast();
  const { targets, loading: profileLoading } = useProfile();
  const [tab, setTab] = useState<Tab>("log");
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [water, setWater] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [customOpen, setCustomOpen] = useState(false);

  const t = targets ?? { calories: 2200, protein: 140, carbs: 260, fat: 65, waterMl: 3000 };

  const totals = useMemo(() => ({
    cal: logs.reduce((a, l) => a + Number(l.calories), 0),
    protein: logs.reduce((a, l) => a + Number(l.protein), 0),
    carbs: logs.reduce((a, l) => a + Number(l.carbs), 0),
    fat: logs.reduce((a, l) => a + Number(l.fat), 0),
  }), [logs]);

  const plan = useMemo(() => getDietPlan(t.calories, vegOnly), [t.calories, vegOnly]);
  const spotlight = useMemo(() => getBreakfastSpotlight(vegOnly), [vegOnly]);

  async function load() {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const uid = user.user.id;
      const today = todayISO();
      const [foodRes, waterRes, cfRes] = await Promise.all([
        supabase.from("food_logs").select("*").eq("user_id", uid).eq("date", today).order("created_at", { ascending: false }),
        supabase.from("water_logs").select("ml").eq("user_id", uid).eq("date", today),
        supabase.from("custom_foods").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      ]);
      if (foodRes.error) throw foodRes.error;
      setLogs((foodRes.data ?? []) as FoodLog[]);
      setWater((waterRes.data ?? []).reduce((a, w) => a + Number((w as { ml: number }).ml), 0));
      setCustomFoods((cfRes.data ?? []) as CustomFood[]);
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function logSuggestion(m: MealSuggestion, meal: MealType) {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      // Prefer real DB macros when the food exists in the catalog
      const { data: found } = await supabase.from("food_items").select("*").ilike("name", `%${m.name}%`).limit(1).single();
      let cal: number, p: number, c: number, f: number, fid: string | null = null, cname: string | null = m.name;
      if (found) {
        const fi = found as FoodItem;
        const k = m.grams / 100;
        cal = fi.calories_per_100g * k; p = fi.protein_per_100g * k; c = fi.carbs_per_100g * k; f = fi.fat_per_100g * k;
        fid = fi.id; cname = null;
      } else {
        const mm = mealMacros(m);
        cal = mm.kcal; p = mm.protein; c = mm.carbs; f = mm.fat;
      }
      const { data, error } = await supabase.from("food_logs").insert({
        user_id: user.user.id, date: todayISO(), meal_type: meal,
        food_item_id: fid, custom_name: cname, quantity_grams: m.grams,
        calories: Math.round(cal), protein: Math.round(p * 10) / 10,
        carbs: Math.round(c * 10) / 10, fat: Math.round(f * 10) / 10,
      }).select().single();
      if (error) throw error;
      setLogs((prev) => [data as FoodLog, ...prev]);
      fireConfetti({ count: 45, durationMs: 1400 });
      toast(`${m.name} logged to ${MEAL_LABELS[meal]}`, "success");
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  async function addWater(ml: number) {
    setWater((w) => w + ml);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { error } = await supabase.from("water_logs").insert({ user_id: user.user.id, date: todayISO(), ml });
      if (error) throw error;
      if (water + ml >= t.waterMl) fireConfetti({ count: 60 });
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
    } catch (err) {
      toast(friendlyError(err), "error");
      load();
    }
  }

  async function deleteCustomFood(id: string) {
    setCustomFoods((prev) => prev.filter((c) => c.id !== id));
    try {
      const supabase = createClient();
      const { error } = await supabase.from("custom_foods").delete().eq("id", id);
      if (error) throw error;
    } catch (err) {
      toast(friendlyError(err), "error");
      load();
    }
  }

  const busy = loading || profileLoading;

  return (
    <div className="min-h-dvh pb-28">
      <div className="page-enter px-5 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight">Diet</h1>
          <button onClick={() => setModalOpen(true)} className="btn-press flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-black text-black">
            <IconPlus width={16} height={16} /> Add food
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 rounded-2xl border border-white/10 bg-card p-1">
          {(["log", "recommended", "mine"] as Tab[]).map((tb) => (
            <button key={tb} onClick={() => setTab(tb)} className={`btn-press rounded-xl py-2.5 text-[13px] font-bold capitalize transition-all ${tab === tb ? "bg-white text-black" : "text-white/45"}`}>
              {tb === "mine" ? "My foods" : tb}
            </button>
          ))}
        </div>

        {busy ? (
          <div className="mt-4 flex flex-col gap-3"><Skeleton className="h-44" /><Skeleton className="h-32" /></div>
        ) : (
          <>
            {tab === "log" && (
              <div className="mt-4">
                {/* macro hero */}
                <Card className="flex items-center gap-5 !p-5">
                  <Ring pct={(totals.cal / t.calories) * 100} size={120} stroke={12} label={`${Math.round(totals.cal)}`} sub={`of ${t.calories} kcal`} />
                  <div className="flex flex-1 flex-col gap-3">
                    <MacroRow label="Protein" value={totals.protein} target={t.protein} unit="g" />
                    <MacroRow label="Carbs" value={totals.carbs} target={t.carbs} unit="g" />
                    <MacroRow label="Fat" value={totals.fat} target={t.fat} unit="g" />
                  </div>
                </Card>

                {/* water */}
                <Card className="mt-3">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 font-extrabold"><IconDrop width={18} height={18} /> Water</p>
                    <p className="text-sm font-black tabular-nums">{(water / 1000).toFixed(1)}L <span className="text-white/40">/ {(t.waterMl / 1000).toFixed(1)}L</span></p>
                  </div>
                  <ProgressBar pct={(water / t.waterMl) * 100} className="mt-2" />
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {[250, 500, 750, 1000].map((ml) => (
                      <button key={ml} onClick={() => addWater(ml)} className="btn-press rounded-xl border border-white/12 bg-white/5 py-2.5 text-xs font-black">
                        +{ml >= 1000 ? "1L" : `${ml}ml`}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* meals */}
                {MEALS.map((m) => {
                  const items = logs.filter((l) => l.meal_type === m);
                  const cal = items.reduce((a, l) => a + Number(l.calories), 0);
                  return (
                    <div key={m} className="mt-5">
                      <SectionTitle title={MEAL_LABELS[m]} sub={items.length ? `${Math.round(cal)} kcal` : "Nothing logged yet"} />
                      {items.length === 0 ? (
                        <button onClick={() => setModalOpen(true)} className="btn-press w-full rounded-3xl border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm font-bold text-white/40">
                          + Log {MEAL_LABELS[m].toLowerCase()}
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {items.map((l) => (
                            <div key={l.id} className="pop-in flex items-center gap-3 rounded-2xl border border-white/10 bg-card p-3">
                              <div className="flex-1">
                                <p className="text-sm font-extrabold">{l.custom_name ?? "Food"}</p>
                                <p className="text-[11px] text-white/45 tabular-nums">
                                  {l.quantity_grams}g · {Math.round(Number(l.calories))} kcal · P {Number(l.protein).toFixed(0)}g · C {Number(l.carbs).toFixed(0)}g · F {Number(l.fat).toFixed(0)}g
                                </p>
                              </div>
                              <button onClick={() => deleteLog(l.id)} className="btn-press p-2 text-white/30" aria-label="delete entry">
                                <IconTrash width={17} height={17} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "recommended" && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <SectionTitle title="Eat like a plan" sub={`~${t.calories} kcal · ${t.protein}g protein`} />
                  <button onClick={() => setVegOnly((v) => !v)} className={`btn-press flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-black ${vegOnly ? "border-white bg-white text-black" : "border-white/15 text-white/60"}`}>
                    {vegOnly && <IconCheck width={14} height={14} />} Veg only
                  </button>
                </div>

                {/* BREAKFAST SPOTLIGHT */}
                <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.08] to-transparent p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/50">
                    <IconBolt width={13} height={13} /> Breakfast spotlight
                  </p>
                  <p className="mt-1 text-base font-black">Start strong. Pick your fuel.</p>
                  <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
                    {spotlight.map((m) => (
                      <SpotlightCard key={m.name} m={m} onLog={() => logSuggestion(m, "breakfast")} />
                    ))}
                  </div>
                </div>

                {/* full day plan */}
                {(["breakfast", "lunch", "snacks", "dinner"] as MealType[]).map((meal) => (
                  <div key={meal} className="mt-5">
                    <SectionTitle title={MEAL_LABELS[meal]} sub={`${Math.round(plan[meal].reduce((a, m) => a + (mealMacros(m).kcal), 0))} kcal suggested`} />
                    <div className="flex flex-col gap-2">
                      {plan[meal].map((m) => {
                        const mm = mealMacros(m);
                        return (
                          <Card key={m.name} className="card-press !p-3">
                            <div className="flex items-center gap-3">
                              <Tile name={m.name} size="sm" />
                              <div className="flex-1">
                                <p className="text-sm font-extrabold">{m.name}</p>
                                <p className="text-[11px] text-white/45">{m.why}</p>
                                <p className="mt-0.5 text-[11px] font-bold tabular-nums text-white/70">
                                  {m.grams}g · {mm.kcal} kcal · P {mm.protein}g · C {mm.carbs}g · F {mm.fat}g
                                </p>
                              </div>
                              <button onClick={() => logSuggestion(m, meal)} className="btn-press flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-black" aria-label={`Log ${m.name}`}>
                                <IconPlus width={18} height={18} />
                              </button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <p className="mt-4 text-center text-[11px] text-white/30">{MEDICAL_DISCLAIMER}</p>
              </div>
            )}

            {tab === "mine" && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <SectionTitle title="My foods" sub="Your recipes, your macros" />
                  <button onClick={() => setCustomOpen(true)} className="btn-press flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-black text-black">
                    <IconPlus width={14} height={14} /> New
                  </button>
                </div>
                {customFoods.length === 0 ? (
                  <EmptyState icon={<IconFood width={28} height={28} />} title="No custom foods yet" sub="Save your own recipes with macros you define." />
                ) : (
                  <div className="flex flex-col gap-2">
                    {customFoods.map((c) => (
                      <Card key={c.id} className="!p-3">
                        <div className="flex items-center gap-3">
                          <Tile name={c.name} size="sm" />
                          <div className="flex-1">
                            <p className="text-sm font-extrabold">{c.name}</p>
                            <p className="text-[11px] text-white/45 tabular-nums">
                              {c.serving ?? "1 serving"} · {c.calories} kcal · P {c.protein}g · C {c.carbs}g · F {c.fat}g
                            </p>
                          </div>
                          <button onClick={() => logCustomFood(c)} className="btn-press rounded-xl bg-white px-3 py-2 text-xs font-black text-black">Log</button>
                          <button onClick={() => deleteCustomFood(c.id)} className="btn-press p-2 text-white/30" aria-label="delete">
                            <IconTrash width={16} height={16} />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && <FoodSearchModal onClose={() => setModalOpen(false)} onLogged={() => load()} />}
      {customOpen && <CustomFoodModal onClose={() => setCustomOpen(false)} onSaved={() => { setCustomOpen(false); load(); }} />}
      <TabBar />
    </div>
  );

  async function logCustomFood(c: CustomFood) {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data, error } = await supabase.from("food_logs").insert({
        user_id: user.user.id, date: todayISO(), meal_type: "snacks",
        food_item_id: null, custom_name: c.name, quantity_grams: 100,
        calories: c.calories, protein: c.protein, carbs: c.carbs, fat: c.fat,
      }).select().single();
      if (error) throw error;
      setLogs((prev) => [data as FoodLog, ...prev]);
      fireConfetti({ count: 45, durationMs: 1400 });
      toast(`${c.name} logged`, "success");
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }
}

function MacroRow({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-white/50">{label}</span>
        <span className="font-black tabular-nums">{Math.round(value)}<span className="text-white/40">/{target}{unit}</span></span>
      </div>
      <ProgressBar pct={pct} className="mt-1 !h-1.5" />
    </div>
  );
}

function SpotlightCard({ m, onLog }: { m: MealSuggestion; onLog: () => void }) {
  const mm = mealMacros(m);
  return (
    <div className="w-40 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-card">
      <Tile name={m.name} size="lg" />
      <div className="-mt-2 p-3 pt-0">
        <p className="truncate text-sm font-extrabold">{m.name}</p>
        <p className="mt-0.5 text-[11px] tabular-nums text-white/50">{m.grams}g · {mm.kcal} kcal</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
          <span className="rounded-lg bg-white/8 py-1 text-[10px] font-black">P {mm.protein}</span>
          <span className="rounded-lg bg-white/8 py-1 text-[10px] font-black">C {mm.carbs}</span>
          <span className="rounded-lg bg-white/8 py-1 text-[10px] font-black">F {mm.fat}</span>
        </div>
        <button onClick={onLog} className="btn-press mt-2 w-full rounded-xl bg-white py-2 text-xs font-black text-black">
          Log it
        </button>
      </div>
    </div>
  );
}

/* ---------- food search modal ---------- */
function FoodSearchModal({ onClose, onLogged }: { onClose: () => void; onLogged: () => void }) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState("100");
  const [meal, setMeal] = useState<MealType>("breakfast");
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("food_items").select("*")
          .ilike("name", `%${query.trim()}%`).order("name").limit(25);
        if (error) throw error;
        setResults((data ?? []) as FoodItem[]);
      } catch (err) {
        toast(friendlyError(err), "error");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const sel = selected;
  const g = Math.max(1, Number(grams) || 100);
  const macros = sel ? {
    cal: Math.round((sel.calories_per_100g * g) / 100),
    p: Math.round(((sel.protein_per_100g * g) / 100) * 10) / 10,
    c: Math.round(((sel.carbs_per_100g * g) / 100) * 10) / 10,
    f: Math.round(((sel.fat_per_100g * g) / 100) * 10) / 10,
  } : null;

  async function log() {
    if (!sel || !macros) return;
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { error } = await supabase.from("food_logs").insert({
        user_id: user.user.id, date: todayISO(), meal_type: meal,
        food_item_id: sel.id, custom_name: null, quantity_grams: g,
        calories: macros.cal, protein: macros.p, carbs: macros.c, fat: macros.f,
      });
      if (error) throw error;
      fireConfetti({ count: 45, durationMs: 1400 });
      toast(`${sel.name} logged`, "success");
      onLogged();
      onClose();
    } catch (err) {
      toast(friendlyError(err), "error");
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black">Log food</h3>
        <ModalClose onClose={onClose} />
      </div>
      {!sel ? (
        <>
          <div className="relative mt-3">
            <IconSearch width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input autoFocus className="field !pl-11" placeholder="Try &quot;upma&quot;, &quot;egg&quot;, &quot;paneer&quot;…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="mt-3 flex max-h-[46dvh] flex-col gap-2 overflow-y-auto">
            {searching && <Skeleton className="h-16" />}
            {results.map((f) => (
              <button key={f.id} onClick={() => setSelected(f)} className="card-press flex items-center gap-3 rounded-2xl bg-white/[0.04] p-2.5 text-left">
                <Tile name={f.name} image={f.image_url} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-extrabold">{f.name}</p>
                  <p className="text-[11px] text-white/45 tabular-nums">{f.calories_per_100g} kcal / 100g</p>
                </div>
                <IconPlus width={18} height={18} className="text-white/40" />
              </button>
            ))}
            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <p className="py-6 text-center text-sm text-white/40">No matches. Try another spelling.</p>
            )}
          </div>
        </>
      ) : (
        <div className="pop-in mt-3">
          <div className="flex items-center gap-3">
            <Tile name={sel.name} image={sel.image_url} />
            <div>
              <p className="font-black">{sel.name}</p>
              <p className="text-xs text-white/45">{sel.serving_desc ?? "per 100g"}</p>
            </div>
            <button onClick={() => setSelected(null)} className="btn-press ml-auto p-2 text-white/40" aria-label="change food">
              <IconX width={18} height={18} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Grams</label>
              <input type="number" className="field text-center text-lg font-black" value={grams} onChange={(e) => setGrams(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">Meal</label>
              <select className="field" value={meal} onChange={(e) => setMeal(e.target.value as MealType)}>
                {MEALS.map((m) => <option key={m} value={m}>{MEAL_LABELS[m]}</option>)}
              </select>
            </div>
          </div>
          {macros && (
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[["Cal", macros.cal, ""], ["Protein", macros.p, "g"], ["Carbs", macros.c, "g"], ["Fat", macros.f, "g"]].map(([l, v, u]) => (
                <div key={l as string} className="rounded-2xl bg-white/[0.05] p-3">
                  <p className="text-base font-black tabular-nums">{v}{u}</p>
                  <p className="text-[10px] font-bold text-white/40">{l}</p>
                </div>
              ))}
            </div>
          )}
          <Btn onClick={log} className="mt-4 w-full">Log {g}g</Btn>
        </div>
      )}
    </Sheet>
  );
}

/* ---------- custom food modal ---------- */
function CustomFoodModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim() || !cal) { toast("Name and calories are required.", "error"); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { error } = await supabase.from("custom_foods").insert({
        user_id: user.user.id, name: name.trim(),
        calories: Number(cal), protein: Number(p) || 0, carbs: Number(c) || 0, fat: Number(f) || 0,
      });
      if (error) throw error;
      toast("Custom food saved", "success");
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
        <h3 className="text-lg font-black">New custom food</h3>
        <ModalClose onClose={onClose} />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <input className="field" placeholder="Name — e.g. Mom's chicken curry" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input type="number" className="field" placeholder="Calories" value={cal} onChange={(e) => setCal(e.target.value)} />
          <input type="number" className="field" placeholder="Protein (g)" value={p} onChange={(e) => setP(e.target.value)} />
          <input type="number" className="field" placeholder="Carbs (g)" value={c} onChange={(e) => setC(e.target.value)} />
          <input type="number" className="field" placeholder="Fat (g)" value={f} onChange={(e) => setF(e.target.value)} />
        </div>
        <p className="text-xs text-white/40">Values are per serving as you define it.</p>
        <Btn onClick={save} disabled={busy} className="w-full">{busy ? "Saving…" : "Save food"}</Btn>
      </div>
    </Sheet>
  );
}
