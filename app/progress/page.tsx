"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TabBar from "@/components/TabBar";
import { Card, SectionTitle, Skeleton, Btn, Sheet, ModalClose, EmptyState } from "@/components/ui";
import { friendlyError, useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/useProfile";
import { calcStreak, todayISO } from "@/lib/fitness";
import { projectWeeks } from "@/lib/recommend";
import type { Measurement } from "@/lib/supabase/types";
import { IconCamera, IconChart, IconPlus, IconTrophy } from "@/components/icons";

interface Badge { id: string; label: string; desc: string; earned: boolean }
interface Photo { name: string; url: string; date: string }

export default function ProgressPage() {
  const { toast } = useToast();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [beforeIdx, setBeforeIdx] = useState<number | null>(null);
  const [afterIdx, setAfterIdx] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const weights = useMemo(
    () => measurements.filter((m) => m.weight_kg != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({ date: m.date, w: Number(m.weight_kg) })),
    [measurements]
  );
  const latest = weights[weights.length - 1];
  const first = weights[0];
  const delta = latest && first ? Math.round((latest.w - first.w) * 10) / 10 : 0;

  const projection = useMemo(() => {
    const cur = latest?.w ?? profile?.weight_kg;
    const tgt = profile?.target_weight_kg;
    if (!cur || !tgt) return null;
    return projectWeeks(cur, tgt, profile?.goal ?? "maintain");
  }, [latest, profile]);

  async function load() {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const uid = user.user.id;
      const [mRes, sRes, pRes] = await Promise.all([
        supabase.from("measurements").select("*").eq("user_id", uid).order("date", { ascending: true }),
        supabase.from("workout_sessions").select("date,completed").eq("user_id", uid),
        supabase.storage.from("progress-photos").list(uid, { limit: 100, sortBy: { column: "created_at", order: "asc" } }),
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
        { id: "loss5", label: "5 Kilos Down", desc: "Lose 5 kg from first weigh-in", earned: lost >= 5 },
        { id: "tracker", label: "Data Driven", desc: "Log 5 weigh-ins", earned: wts.length >= 5 },
      ]);

      const list = (pRes.data ?? []).filter((f) => f.name.match(/\.(jpe?g|png|webp)$/i));
      const urls: Photo[] = await Promise.all(list.map(async (f) => {
        const { data } = await supabase.storage.from("progress-photos").createSignedUrl(`${uid}/${f.name}`, 60 * 60 * 24 * 7);
        const created = (f as { created_at?: string }).created_at;
        return { name: f.name, url: data?.signedUrl ?? "", date: created ? created.slice(0, 10) : "" };
      }));
      const valid = urls.filter((p) => p.url);
      setPhotos(valid);
      if (valid.length >= 2) {
        setBeforeIdx(0);
        setAfterIdx(valid.length - 1);
      } else if (valid.length === 1) {
        setBeforeIdx(0);
        setAfterIdx(null);
      }
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const path = `${user.user.id}/${todayISO()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage.from("progress-photos").upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (error) throw error;
      toast("Photo added", "success");
      await load();
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="min-h-dvh pb-28">
      <div className="page-enter px-5 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight">Progress</h1>
          <button onClick={() => setFormOpen(true)} className="btn-press flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-black text-black">
            <IconPlus width={16} height={16} /> Weigh in
          </button>
        </div>

        {loading ? (
          <div className="mt-4 flex flex-col gap-3"><Skeleton className="h-52" /><Skeleton className="h-24" /></div>
        ) : (
          <>
            {/* weight trend */}
            <Card className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-white/45">Weight trend</p>
                {latest && (
                  <p className="text-sm font-extrabold tabular-nums">
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
            </Card>

            {/* goal projection */}
            {projection && (
              <Card className="mt-3">
                <SectionTitle title="Goal projection" sub={projection.label} />
                <div className="mt-3 flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-black tabular-nums">{latest?.w ?? profile?.weight_kg}</p>
                    <p className="text-[10px] text-white/45">now</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="proj-animate h-full w-2/3 rounded-full bg-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black tabular-nums">{profile?.target_weight_kg}</p>
                    <p className="text-[10px] text-white/45">target</p>
                  </div>
                </div>
              </Card>
            )}

            {/* before / after */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <SectionTitle title="Before / After" sub="Drag the slider to compare" />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-press flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-black text-black disabled:opacity-50">
                  <IconCamera width={14} height={14} /> {uploading ? "Uploading…" : "Add photo"}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              {photos.length >= 2 && beforeIdx !== null && afterIdx !== null ? (
                <>
                  <CompareSlider before={photos[beforeIdx]} after={photos[afterIdx]} />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-white/45">
                    <p><span className="font-black text-white">Before</span> · {photos[beforeIdx].date || photos[beforeIdx].name}</p>
                    <p><span className="font-black text-white">After</span> · {photos[afterIdx].date || photos[afterIdx].name}</p>
                  </div>
                </>
              ) : (
                <EmptyState icon={<IconCamera width={28} height={28} />} title="No comparison yet" sub="Add at least two photos to unlock the before/after slider." />
              )}
              {photos.length > 0 && (
                <>
                  <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
                    {photos.map((p, i) => (
                      <button key={p.name} onClick={() => { setBeforeIdx(i); setAfterIdx(i); }} className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${i === beforeIdx || i === afterIdx ? "border-white" : "border-white/10"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={p.date} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setBeforeIdx(0)} className="btn-press flex-1 rounded-xl border border-white/12 py-2 text-[11px] font-black text-white/60">First = before</button>
                    <button onClick={() => setAfterIdx(photos.length - 1)} className="btn-press flex-1 rounded-xl border border-white/12 py-2 text-[11px] font-black text-white/60">Last = after</button>
                  </div>
                </>
              )}
            </div>

            {/* badges */}
            <div className="mt-5">
              <SectionTitle title="Badges" sub={`${badges.filter((b) => b.earned).length}/${badges.length} earned`} />
              <div className="mt-2 grid grid-cols-2 gap-3">
                {badges.map((b, i) => (
                  <div key={b.id} className={`pop-in rounded-3xl border p-4 transition-all ${b.earned ? "border-white bg-white text-black" : "border-white/10 bg-card opacity-50"}`} style={{ animationDelay: `${i * 60}ms` }}>
                    <IconTrophy width={24} height={24} className={b.earned ? "text-black" : "text-white/30"} />
                    <p className="mt-2 font-extrabold">{b.label}</p>
                    <p className={`text-xs ${b.earned ? "text-black/60" : "text-white/50"}`}>{b.desc}</p>
                    {b.earned && <p className="mt-1 text-[11px] font-black tracking-widest">EARNED</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* history */}
            {measurements.length > 0 && (
              <Card className="mt-4">
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
              </Card>
            )}
          </>
        )}
      </div>

      {formOpen && (
        <Sheet onClose={() => setFormOpen(false)}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">Log measurements</h2>
            <ModalClose onClose={() => setFormOpen(false)} />
          </div>
          <MeasureFormInner onSaved={() => { setFormOpen(false); load(); }} />
        </Sheet>
      )}
      <TabBar />
    </div>
  );
}

/* ---------- comparison slider ---------- */
function CompareSlider({ before, after }: { before: Photo; after: Photo }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);

  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(2, Math.min(98, x)));
  }

  return (
    <div
      ref={ref}
      onPointerDown={move}
      onPointerMove={(e) => { if (e.buttons) move(e); }}
      className="relative mt-3 h-72 w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-3xl border border-white/12 bg-black"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after.url} alt="after" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before.url} alt="before" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} draggable={false} />
      <div className="absolute inset-y-0 flex items-center" style={{ left: `${pos}%` }}>
        <div className="flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-white font-black text-black shadow-xl">⟨⟩</div>
      </div>
      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-black text-white">BEFORE</span>
      <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-black">AFTER</span>
    </div>
  );
}

/* ---------- weight chart (monochrome) ---------- */
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
          <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={P} x2={W - P} y1={P + f * (H - 2 * P)} y2={P + f * (H - 2 * P)} stroke="rgba(255,255,255,0.06)" />
      ))}
      <path d={`${d} L${x(points.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`} fill="url(#wfill)" />
      <path d={d} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" className="chart-draw" />
      {points.map((p, i) => (
        <g key={p.date + i}>
          <circle cx={x(i)} cy={y(p.w)} r="4.5" fill="#000" stroke="#fff" strokeWidth="2.5" />
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

/* ---------- measure form ---------- */
function MeasureFormInner({ onSaved }: { onSaved: () => void }) {
  const { toast } = useToast();
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!weight) { toast("Enter your weight.", "error"); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in.");
      const { error } = await supabase.from("measurements").insert({
        user_id: user.user.id, date: todayISO(),
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
    <div className="mt-4 flex flex-col gap-3">
      {fields.map(([label, val, set, ph]) => (
        <div key={label}>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/40">{label}</label>
          <input type="number" step="0.1" className="field" placeholder={ph} value={val} onChange={(e) => set(e.target.value)} />
        </div>
      ))}
      <Btn onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Btn>
    </div>
  );
}
