"use client";

import { useEffect, useMemo, useState } from "react";
import TabBar from "@/components/TabBar";
import { Skeleton } from "@/components/CountUp";
import { friendlyError, useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { calcStreak, todayISO } from "@/lib/fitness";
import type { Measurement } from "@/lib/supabase/types";
import { IconChart, IconPlus, IconTrophy, IconX } from "@/components/icons";

interface Badge {
  id: string;
  label: string;
  desc: string;
  earned: boolean;
}

export default function ProgressPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const weights = useMemo(
    () =>
      measurements
        .filter((m) => m.weight_kg != null)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((m) => ({ date: m.date, w: Number(m.weight_kg) })),
    [measurements]
  );
  const latest = weights[weights.length - 1];
  const first = weights[0];
  const delta = latest && first ? Math.round((latest.w - first.w) * 10) / 10 : 0;

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;
        const uid = user.user.id;

        const [mRes, sRes] = await Promise.all([
          supabase.from("measurements").select("*").eq("user_id", uid).order("date", { ascending: true }),
          supabase.from("workout_sessions").select("date,completed").eq("user_id", uid),
        ]);
        if (mRes.error) throw mRes.error;
        if (sRes.error) throw sRes.error;
        const ms = (mRes.data ?? []) as Measurement[];
        setMeasurements(ms);
        const sessions = (sRes.data ?? []) as { date: string; completed: boolean | null }[];
        const doneCount = sessions.filter((s) => s.completed).length;
        const streak = calcStreak(sessions.map((s) => s.date));
        const wts = ms.filter((m) => m.weight_kg != null).sort((a, b) => a.date.localeCompare(b.date));
        const lost = wts.length >= 2 ? Number(wts[0].weight_kg) - Number(wts[wts.length - 1].weight_kg) : 0;

        setBadges([
          { id: "first", label: "First Rep", desc: "Complete your first workout", earned: doneCount >= 1 },
          { id: "ten", label: "Regular", desc: "Complete 10 workouts", earned: doneCount >= 10 },
          { id: "streak7", label: "On Fire", desc: "7-day activity streak", earned: streak >= 7 },
          { id: "streak30", label: "Unstoppable", desc: "30-day activity streak", earned: streak >= 30 },
          { id: "loss5", label: "5 Kilos Down", desc: "Lose 5 kg from your first weigh-in", earned: lost >= 5 },
          { id: "tracker", label: "Data Driven", desc: "Log 5 weigh-ins", earned: wts.length >= 5 },
        ]);
      } catch (err) {
        toast(friendlyError(err), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  return (
    <div className="min-h-dvh pb-28">
      <div className="page-enter px-5 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">Progress</h1>
          <button
            onClick={() => setFormOpen(true)}
            className="btn-press flex items-center gap-1.5 rounded-full bg-gradient-to-r from-lime to-cy px-4 py-2.5 text-sm font-extrabold text-ink"
          >
            <IconPlus width={16} height={16} /> Weigh in
          </button>
        </div>

        {loading ? (
          <div className="mt-4 flex flex-col gap-3"><Skeleton className="h-52" /><Skeleton className="h-24" /></div>
        ) : (
          <>
            <div className="mt-4 rounded-3xl bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-white/45">Weight trend</p>
                {latest && (
                  <p className={`text-sm font-extrabold ${delta <= 0 ? "text-lime" : "text-orange-400"}`}>
                    {delta > 0 ? "+" : ""}{delta} kg
                  </p>
                )}
              </div>
              {weights.length >= 2 ? (
                <WeightChart points={weights} />
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <IconChart width={32} height={32} className="text-white/20" />
                  <p className="mt-2 text-sm text-white/45">
                    {weights.length === 1 ? "Log one more weigh-in to see your trend." : "Log your first weigh-in to start the chart."}
                  </p>
                </div>
              )}
              {latest && (
                <p className="mt-2 text-center text-sm text-white/50">
                  Latest: <span className="font-extrabold text-white">{latest.w} kg</span> on {latest.date}
                </p>
              )}
            </div>

            <div className="mt-4">
              <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-white/45">Badges</p>
              <div className="grid grid-cols-2 gap-3">
                {badges.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-3xl border p-4 transition-all ${
                      b.earned ? "border-lime/40 bg-lime/10" : "border-white/10 bg-card opacity-50"
                    }`}
                  >
                    <IconTrophy width={24} height={24} className={b.earned ? "text-lime" : "text-white/30"} />
                    <p className="mt-2 font-extrabold">{b.label}</p>
                    <p className="text-xs text-white/50">{b.desc}</p>
                    {b.earned && <p className="mt-1 text-[11px] font-extrabold text-lime">EARNED</p>}
                  </div>
                ))}
              </div>
            </div>

            {measurements.length > 0 && (
              <div className="mt-4 rounded-3xl bg-card p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-white/45">History</p>
                <div className="mt-2 flex flex-col gap-2">
                  {[...measurements].reverse().slice(0, 8).map((m) => (
                    <div key={m.id} className="flex items-center justify-between border-b border-white/5 py-2 text-sm last:border-0">
                      <span className="text-white/55">{m.date}</span>
                      <span className="font-bold">
                        {m.weight_kg ? `${m.weight_kg} kg` : "—"}
                        {m.waist_cm ? <span className="ml-2 text-white/50">waist {m.waist_cm}cm</span> : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {formOpen && (
        <MeasureForm
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            setLoading(true);
            window.location.reload();
          }}
        />
      )}
      <TabBar />
    </div>
  );
}

function WeightChart({ points }: { points: { date: string; w: number }[] }) {
  const W = 340, H = 170, P = 28;
  const ws = points.map((p) => p.w);
  const min = Math.min(...ws), max = Math.max(...ws);
  const span = Math.max(1, max - min);
  const x = (i: number) => P + (i / Math.max(1, points.length - 1)) * (W - 2 * P);
  const y = (w: number) => H - P - ((w - min) / span) * (H - 2 * P);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.w).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
      <defs>
        <linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A3E635" stopOpacity="0.35" />
          <stop offset="1" stopColor="#A3E635" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={P} x2={W - P} y1={P + f * (H - 2 * P)} y2={P + f * (H - 2 * P)} stroke="rgba(255,255,255,0.06)" />
      ))}
      <path d={`${d} L${x(points.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`} fill="url(#wfill)" />
      <path d={d} fill="none" stroke="#A3E635" strokeWidth="3" strokeLinecap="round" className="chart-draw" />
      {points.map((p, i) => (
        <g key={p.date + i}>
          <circle cx={x(i)} cy={y(p.w)} r="4.5" fill="#0B0E17" stroke="#A3E635" strokeWidth="2.5" />
          {(i === 0 || i === points.length - 1) && (
            <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.45)">
              {p.date.slice(5)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function MeasureForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!weight) {
      toast("Enter your weight.", "error");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in.");
      const { error } = await supabase.from("measurements").insert({
        user_id: user.user.id,
        date: todayISO(),
        weight_kg: Number(weight),
        body_fat_pct: fat ? Number(fat) : null,
        chest_cm: chest ? Number(chest) : null,
        waist_cm: waist ? Number(waist) : null,
        hips_cm: hips ? Number(hips) : null,
      });
      if (error) throw error;
      toast("Weigh-in saved", "success");
      onSaved();
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setSaving(false);
    }
  }

  const fields: [string, string, React.Dispatch<React.SetStateAction<string>>, string][] = [
    ["Weight (kg)", weight, setWeight, "e.g. 72.5"],
    ["Body fat %", fat, setFat, "optional"],
    ["Chest (cm)", chest, setChest, "optional"],
    ["Waist (cm)", waist, setWaist, "optional"],
    ["Hips (cm)", hips, setHips, "optional"],
  ];

  return (
    <div className="fade-in fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="modal-in w-full max-w-[430px] rounded-t-[2rem] bg-card p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">Log measurements</h2>
          <button onClick={onClose} className="btn-press rounded-full bg-white/10 p-2" aria-label="close">
            <IconX width={18} height={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {fields.map(([label, val, set, ph]) => (
            <div key={label}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/45">{label}</label>
              <input type="number" step="0.1" className="field" placeholder={ph} value={val} onChange={(e) => set(e.target.value)} />
            </div>
          ))}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="btn-press mt-4 w-full rounded-2xl bg-gradient-to-r from-lime to-cy py-4 font-extrabold text-ink disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
