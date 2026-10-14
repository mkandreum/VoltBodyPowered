/** Secciones en hoja de cristal (espejo de SectionHost en ui/v3/ProfileV3.kt + Extras.kt + WeightSheet.kt). */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, type AppTheme, type UserProfile } from '../../store/useAppStore';
import { Haptics } from '../../lib/haptics';
import { ACHIEVEMENTS_CATALOG } from '../../lib/achievements';
import { computeSmartStreak } from '../../lib/routineWeek';
import { computeFatigueIndex, fatigueStatusLabel, type FatigueEntry } from '../../lib/fatigueIndex';
import { computeRecoveryScore, getRecoveryAdvice } from '../../lib/recoveryScore';
import { amountLabel, buildShoppingList, shoppingListText } from '../../lib/shoppingList';
import { authService } from '../../services/authService';
import { workoutService } from '../../services/workoutService';
import { notificationService } from '../../services/notificationService';
import { generatePlan, generateProgressReport, type ProgressReport } from '../../services/geminiService';
import { enrichRoutine } from '../../services/exerciseImageService';
import { BLEHeartRateService, isBLESupported, type BLEConnectionState } from '../../services/BLEHeartRateService';
import {
  Card, CardHeader, DarkButton, Icon, IconCircle, LimeButton, MiniDonut, MockBars, ON_ACCENT, RollingText, SectionLabel, SheetScaffold,
  SmallPill, Spinner, Toggle, ValueUnit, addDays, fmt, trim, cx, enter,
} from '../kit';
import { THEMES, THEME_ACCENT, dateKey, mondayOf, setsLabel, themeLabel } from '../data';
import { useNav } from '../nav';

export default function SectionHost({ id }: { id: string }) {
  switch (id) {
    case 'weight': return <WeightSheet />;
    case 'trends': return <TrendsSheet />;
    case 'shopping': return <ShoppingSheet />;
    case 'personal': return <SheetScaffold title="Datos personales" eyebrow="Perfil"><PersonalData /></SheetScaffold>;
    case 'photos': return <SheetScaffold title="Fotos de progreso" eyebrow="Tu progreso"><Photos /></SheetScaffold>;
    case 'achievements': return <SheetScaffold title="Logros" eyebrow="Tu progreso"><Achievements /></SheetScaffold>;
    case 'habits': return <SheetScaffold title="Hábitos de la semana" eyebrow="Tu progreso"><Habits /></SheetScaffold>;
    case 'recovery': return <SheetScaffold title="Recuperación" eyebrow="Salud"><Recovery /></SheetScaffold>;
    case 'report': return <SheetScaffold title="Informe IA" eyebrow="Tu evolución"><Report /></SheetScaffold>;
    case 'health': return <SheetScaffold title="Salud y sensores" eyebrow="Dispositivos"><Health /></SheetScaffold>;
    case 'notifications': return <SheetScaffold title="Notificaciones" eyebrow="Ajustes"><Notifications /></SheetScaffold>;
    case 'theme': return <SheetScaffold title="Tema" eyebrow="Ajustes"><Theme /></SheetScaffold>;
    case 'data': return <SheetScaffold title="Mis datos" eyebrow="Ajustes"><Data /></SheetScaffold>;
    case 'diet': return <SheetScaffold title="Plan de comidas" eyebrow="Nutrición"><DietPlanSection /></SheetScaffold>;
    case 'fatigue': return <SheetScaffold title="Fatiga muscular" eyebrow="Entreno"><Fatigue /></SheetScaffold>;
    case 'library': return <SheetScaffold title="Rutina personal" eyebrow="Entreno"><Library /></SheetScaffold>;
    default: return <SheetScaffold title=""><p className="t-body" style={{ color: 'var(--v-dim)' }}>Sección no disponible</p></SheetScaffold>;
  }
}

const dim: CSSProperties = { color: 'var(--v-dim)' };
const txt: CSSProperties = { color: 'var(--v-text)' };

// ─────────────────────────────── Peso ───────────────────────────────

function WeightSheet() {
  const { weightLogs, addWeightLog, authToken, showToast } = useAppStore(useShallow((s) => ({
    weightLogs: s.weightLogs, addWeightLog: s.addWeightLog, authToken: s.authToken, showToast: s.showToast,
  })));
  const last = weightLogs.length ? weightLogs[weightLogs.length - 1].weight : null;
  const prev = weightLogs.length >= 2 ? weightLogs[weightLogs.length - 2].weight : null;
  const [value, setValue] = useState(last ?? 70);
  useEffect(() => { if (last != null) setValue(last); }, [last]);
  const delta = prev != null ? value - prev : null;
  const bias = delta == null ? 0 : delta < -0.05 ? -1 : delta > 0.05 ? 1 : 0;
  const tint = bias === -1 ? 'var(--v-accent)' : bias === 1 ? 'var(--v-orange)' : 'var(--v-dim)';
  const recent = weightLogs.slice(-30);
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const save = async () => {
    const kg = r1(value);
    const today = dateKey(new Date());
    addWeightLog({ date: today, weight: kg });
    showToast({ type: 'success', title: `Peso registrado: ${trim(kg)} kg ⚖️` });
    if (authToken) { try { await workoutService.saveWeightLog(authToken, { date: today, weight: kg }); } catch { showToast({ type: 'error', title: 'No se pudo sincronizar el peso' }); } }
  };
  return (
    <SheetScaffold title="Tu peso, hoy" eyebrow="Tu progreso" mixTitle>
      <div className="flex flex-col items-center enter" style={enter(1).style}>
        <div className="flex items-end">
          <RollingText text={trim(value)} className="t-heroxl !text-[68px] !leading-[70px]" color="var(--v-text)" />
          <span className="t-section ml-1.5 mb-3" style={dim}>kg</span>
        </div>
        <div className="h-2.5" />
        <div className="flex items-center rounded-full px-3.5 py-2" style={{ background: `color-mix(in srgb, ${tint} 14%, transparent)` }}>
          <Icon n={bias === -1 ? 'trending_down' : bias === 1 ? 'trending_up' : 'trending_flat'} o size={16} color={tint} />
          <span className="t-card ml-1.5" style={{ color: tint }}>{delta != null ? `${delta >= 0 ? '+' : '-'}${Math.abs(delta).toFixed(1).replace('.', ',')} kg` : 'Sin registro previo'}</span>
        </div>
      </div>
      {recent.length >= 2 ? (
        <div className="enter" style={enter(2).style}>
          <div className="t-label pl-1.5" style={dim}>Evolución</div>
          <div className="h-2" />
          <MockBars values={recent.map((w) => w.weight)} highlight={recent.length - 1} bubble={trim(recent[recent.length - 1].weight)} height={120}
            onSelect={(i) => setValue(recent[i].weight)} />
          <div className="flex justify-between mt-1.5">
            <span className="t-caption" style={dim}>{recent[0].date.slice(5)}</span>
            <span className="t-caption" style={dim}>{recent[recent.length - 1].date.slice(5)}</span>
          </div>
        </div>
      ) : (
        <Card><p className="t-body m-0" style={dim}>Registra peso varios días para ver tu evolución.</p></Card>
      )}
      <div className="flex flex-col items-center enter" style={enter(3).style}>
        <div className="t-label" style={dim}>Registro de hoy</div>
        <div className="h-2.5" />
        <div className="grid grid-cols-3 gap-3 w-full items-center">
          <StepBtn icon="remove" label="Bajar 0,1 kg" onClick={() => setValue((v) => Math.max(20, r1(v - 0.1)))} />
          <div className="flex flex-col items-center">
            <span className="t-hero" style={{ ...txt, fontSize: 30 }}>{trim(value)}</span>
            <span className="t-caption" style={dim}>kg</span>
          </div>
          <StepBtn icon="add" label="Subir 0,1 kg" onClick={() => setValue((v) => Math.min(400, r1(v + 0.1)))} />
        </div>
        <div className="h-3" />
        <LimeButton text={`Registrar ${trim(value)} kg`} onClick={save} />
      </div>
    </SheetScaffold>
  );
}

function StepBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={() => { Haptics.selection(); onClick(); }}
      className="tap h-[70px] rounded-[24px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <Icon n={icon} size={30} color="var(--v-text)" />
    </button>
  );
}

// ─────────────────────────────── Tendencias ───────────────────────────────

function TrendsSheet() {
  const { dailyMetrics, weightLogs } = useAppStore(useShallow((s) => ({ dailyMetrics: s.dailyMetrics, weightLogs: s.weightLogs })));
  const replace = useNav((n) => n.replace);
  const [days, setDays] = useState(30);
  const today = useMemo(() => new Date(), []);
  const weights = useMemo(() => new Map(weightLogs.map((w) => [w.date, w.weight])), [weightLogs]);
  const series = (pick: (k: string) => number | null | undefined) => Array.from({ length: days }, (_, i) => {
    const v = pick(dateKey(addDays(today, i - days + 1)));
    return v == null ? null : v;
  });
  const steps = series((k) => dailyMetrics[k]?.steps);
  const sleep = series((k) => dailyMetrics[k]?.sleepHours);
  const hrv = series((k) => dailyMetrics[k]?.hrv);
  const rhr = series((k) => dailyMetrics[k]?.restingHr);
  const weight = series((k) => weights.get(k));
  const [sel, setSel] = useState(days - 1);
  useEffect(() => setSel(days - 1), [days]);
  const hasHealth = [steps, sleep, hrv, rhr].some((s) => s.some((v) => v != null));
  const label = (d: Date) => `${d.getDate()} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'][d.getMonth()]}`;
  const stepVals = steps.map((v) => v ?? 0);
  return (
    <SheetScaffold title="Tendencias" eyebrow={`Últimos ${days} días`}>
      <div className="flex gap-2 enter" style={enter(1).style}>
        {[7, 30].map((d) => <SmallPill key={d} text={`${d} días`} selected={days === d} onClick={() => { if (days !== d) { Haptics.selection(); setDays(d); } }} />)}
      </div>
      {!hasHealth && (
        <Card className="enter" style={enter(2).style}>
          <div className="t-card" style={txt}>Sin datos de salud todavía</div>
          <p className="t-body m-0" style={dim}>Conecta Health Connect desde la app Android (o Samsung Health a través de él) y tus datos aparecerán aquí.</p>
          <div className="h-3" />
          <LimeButton text="Conectar salud" height={48} onClick={() => replace({ kind: 'section', id: 'health' })} />
        </Card>
      )}
      {steps.some((v) => v != null) && (
        <Card className="enter" style={enter(2).style}>
          <CardHeader icon="directions_walk" tint="var(--v-accent)" title="Pasos" chevron={false} />
          <div className="h-2" />
          <div className="flex items-end">
            <ValueUnit className="flex-1" value={fmt(avg(steps) ?? 0)} unit="de media al día" />
            <TrendBadge delta={halfDelta(steps)} higherIsBetter unit="" />
          </div>
          <div className="h-3" />
          <MockBars values={stepVals} highlight={Math.min(sel, stepVals.length - 1)} bubble={fmt(stepVals[Math.min(sel, stepVals.length - 1)] ?? 0)} height={110} onSelect={setSel} />
          <div className="flex justify-between mt-1.5">
            <span className="t-caption" style={dim}>{label(addDays(today, -(days - 1)))}</span>
            {sel !== stepVals.length - 1 && <span className="t-caption" style={{ color: 'var(--v-accent)' }}>{label(addDays(today, -(days - 1 - sel)))}</span>}
            <span className="t-caption" style={dim}>Hoy</span>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 enter" style={enter(3).style}>
        <TrendTile title="Sueño" values={sleep} unit="h" color="var(--v-water)" higherIsBetter decimals={1} />
        <TrendTile title="HRV" values={hrv} unit="ms" color="var(--v-accent)" higherIsBetter />
      </div>
      <div className="grid grid-cols-2 gap-3 enter" style={enter(4).style}>
        <TrendTile title="FC reposo" values={rhr} unit="lpm" color="var(--v-danger)" higherIsBetter={false} />
        <TrendTile title="Peso" values={weight} unit="kg" color="var(--v-orange)" higherIsBetter={null} decimals={1} smooth />
      </div>
      <p className="t-caption px-1.5 m-0 enter" style={{ ...dim, ...enter(5).style }}>
        La línea gruesa es la media de 7 días (filtra el ruido de un mal día); la fina, el dato diario. Las flechas comparan la segunda mitad del periodo con la primera.
      </p>
    </SheetScaffold>
  );
}

const avg = (v: Array<number | null>) => { const f = v.filter((x): x is number => x != null); return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null; };
const halfDelta = (v: Array<number | null>) => { const h = Math.floor(v.length / 2); const a = avg(v.slice(0, h)); const b = avg(v.slice(h)); return a == null || b == null ? null : b - a; };
const movingAverage = (v: Array<number | null>, w = 7) => v.map((x, i) => { const s = v.slice(Math.max(0, i - w + 1), i + 1).filter((y): y is number => y != null); return x == null && !s.length ? null : s.length ? s.reduce((a, b) => a + b, 0) / s.length : null; });
const fmtD = (x: number, d: number) => (d === 0 ? fmt(Math.trunc(x)) : x.toFixed(d).replace('.', ','));

function TrendTile({ title, values, unit, color, higherIsBetter, decimals = 0, smooth }: {
  title: string; values: Array<number | null>; unit: string; color: string; higherIsBetter: boolean | null; decimals?: number; smooth?: boolean;
}) {
  const a = avg(values);
  const last = [...values].reverse().find((v) => v != null) ?? null;
  const shown = smooth ? last : a;
  return (
    <Card className="h-full">
      <div className="t-card" style={txt}>{title}</div>
      <div className="h-1.5" />
      <ValueUnit value={shown != null ? fmtD(shown, decimals) : '—'} unit={shown == null ? null : smooth ? unit : `${unit} · media`} />
      <div className="h-1" />
      <TrendBadge delta={halfDelta(values)} higherIsBetter={higherIsBetter} unit={unit} decimals={decimals} />
      <div className="flex-1 min-h-2.5" />
      <TrendLine raw={values} values={movingAverage(values)} color={color} />
    </Card>
  );
}

function TrendBadge({ delta, higherIsBetter, unit, decimals = 0 }: { delta: number | null; higherIsBetter: boolean | null; unit: string; decimals?: number }) {
  if (delta == null) return <span className="t-caption" style={dim}>Sin datos suficientes</span>;
  const flat = Math.abs(delta) < (decimals === 0 ? 1 : 0.1);
  const up = delta > 0;
  const good = flat || higherIsBetter == null ? null : up === higherIsBetter;
  const tint = good === true ? 'var(--v-accent)' : good === false ? 'var(--v-orange)' : 'var(--v-dim)';
  const t = flat ? 'Estable' : `${up ? '+' : ''}${fmtD(delta, decimals)}${unit ? ` ${unit}` : ''}`;
  return (
    <span className="inline-flex items-center self-start rounded-full px-2.5 py-1" aria-label={`Tendencia: ${t}`} style={{ background: `color-mix(in srgb, ${tint} 14%, transparent)` }}>
      <Icon n={flat ? 'trending_flat' : up ? 'trending_up' : 'trending_down'} o size={14} color={tint} />
      <span className="ml-1 whitespace-nowrap" style={{ color: tint, font: '500 11px/16px var(--font-sans)' }}>{t}</span>
    </span>
  );
}

function TrendLine({ raw, values, color }: { raw: Array<number | null>; values: Array<number | null>; color: string }) {
  const W = 200, H = 44;
  const pts = values.map((v, i) => (v == null ? null : [i, v] as [number, number])).filter(Boolean) as Array<[number, number]>;
  const rawPts = raw.map((v, i) => (v == null ? null : [i, v] as [number, number])).filter(Boolean) as Array<[number, number]>;
  const all = [...pts, ...rawPts].map((p) => p[1]);
  const mn = Math.min(...all), mx = Math.max(...all), r = Math.max(mx - mn, 0.0001), n = Math.max(1, values.length - 1);
  const pos = ([i, v]: [number, number]) => [(i * W) / n, H * 0.9 - ((v - mn) / r) * H * 0.8] as [number, number];
  const path = (o: Array<[number, number]>) => o.reduce((d, p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `${d} C${(o[i - 1][0] + p[0]) / 2},${o[i - 1][1]} ${(o[i - 1][0] + p[0]) / 2},${p[1]} ${p[0]},${p[1]}`), '');
  const o = pts.map(pos);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-11 overflow-visible">
      <line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke="var(--v-surface2)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {rawPts.length >= 2 && <path d={path(rawPts.map(pos))} fill="none" stroke={color} strokeOpacity={0.28} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />}
      {o.length >= 2 && <path d={path(o)} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

// ─────────────────────────────── Lista de la compra ───────────────────────────────

function ShoppingSheet() {
  const diet = useAppStore((s) => s.diet);
  const showToast = useAppStore((s) => s.showToast);
  const week = useMemo(() => mondayOf(new Date()), []);
  const storeKey = `voltbody_shopping_${dateKey(week)}`;
  const [done, setDone] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem(storeKey) ?? '[]')); } catch { return new Set(); } });
  const persist = (s: Set<string>) => { setDone(s); try { localStorage.setItem(storeKey, JSON.stringify([...s])); } catch { /* sin almacenamiento */ } };
  const aisles = useMemo(() => (diet ? buildShoppingList(diet) : []), [diet]);
  const total = aisles.reduce((a, x) => a + x.items.length, 0);
  const doneCount = aisles.reduce((a, x) => a + x.items.filter((i) => done.has(i.key)).length, 0);
  const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
  const end = addDays(week, 6);
  const range = `${week.getDate()} ${M[week.getMonth()]} – ${end.getDate()} ${M[end.getMonth()]}`;
  const share = async () => {
    const text = shoppingListText(aisles, done);
    try {
      if (navigator.share) await navigator.share({ title: 'Lista de la compra', text });
      else { await navigator.clipboard.writeText(text); showToast({ type: 'success', title: 'Lista copiada' }); }
    } catch { /* cancelado */ }
  };
  return (
    <SheetScaffold title="Lista de la compra" eyebrow={`Semana · ${range}`}>
      {!aisles.length ? (
        <Card>
          <div className="t-card" style={txt}>Aún no hay menú</div>
          <p className="t-body m-0" style={dim}>Genera tu plan de comidas y aquí aparecerá todo lo que necesitas para la semana.</p>
        </Card>
      ) : (<>
        <Card className="enter" style={enter(1).style}>
          <div className="flex items-center">
            <ValueUnit className="flex-1" value={`${doneCount}`} unit={`de ${total} en el carro`} valueClass="t-hero" />
            <MiniDonut progress={total ? doneCount / total : 0} size={48} color="var(--v-accent)" />
          </div>
          <div className="h-3.5" />
          <div className="grid grid-cols-2 gap-2">
            <DarkButton text="Compartir" icon="share" height={48} className="w-full" onClick={share} />
            {doneCount > 0 && <DarkButton text="Vaciar marcas" height={48} tint="var(--v-dim)" className="w-full" onClick={() => persist(new Set())} />}
          </div>
          {!diet?.week?.length && <p className="t-caption mt-2.5 mb-0" style={dim}>Tu plan repite el mismo menú cada día: las cantidades son ×7.</p>}
        </Card>
        {aisles.map((a, ai) => (
          <div key={a.name} className="flex flex-col gap-1.5 enter" style={enter(2 + ai).style}>
            <div className="t-label pl-1.5 pt-1.5" style={dim}>{a.emoji}  {a.name}</div>
            <Card padding={4}>
              {a.items.map((it) => {
                const checked = done.has(it.key);
                return (
                  <button key={it.key} type="button" role="checkbox" aria-checked={checked}
                    onClick={() => { Haptics.selection(); const s = new Set(done); if (checked) s.delete(it.key); else s.add(it.key); persist(s); }}
                    className="tap w-full min-h-12 flex items-center rounded-[18px] px-3 py-2 text-left" style={{ ['--tap' as string]: 0.98 } as CSSProperties}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors"
                      style={{ background: checked ? 'var(--v-accent)' : 'transparent', boxShadow: `inset 0 0 0 1.5px ${checked ? 'var(--v-accent)' : 'color-mix(in srgb, var(--v-dim) 50%, transparent)'}` }}>
                      {checked && <Icon n="check" size={16} color={ON_ACCENT} />}
                    </span>
                    <span className="t-card flex-1 ml-3 line-clamp-2" style={{ color: checked ? 'var(--v-dim)' : 'var(--v-text)', textDecoration: checked ? 'line-through' : undefined }}>{it.name}</span>
                    <span className="t-caption ml-2 whitespace-nowrap" style={dim}>{amountLabel(it)}</span>
                  </button>
                );
              })}
            </Card>
          </div>
        ))}
      </>)}
    </SheetScaffold>
  );
}

// ─────────────────────────────── Datos personales ───────────────────────────────

function Field({ label, value, onChange, type = 'text', suffix }: { label: string; value: string; onChange: (v: string) => void; type?: string; suffix?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="t-label pl-1" style={dim}>{label}</span>
      <span className="relative">
        <input className="input-field" type={type} value={value} onChange={(e) => onChange(e.target.value)} inputMode={type === 'number' ? 'decimal' : undefined} />
        {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 t-caption pointer-events-none" style={dim}>{suffix}</span>}
      </span>
    </label>
  );
}

function PersonalData() {
  const s = useAppStore(useShallow((st) => ({
    profile: st.profile, updateProfile: st.updateProfile, authToken: st.authToken, showToast: st.showToast,
    motivationPhrase: st.motivationPhrase, setMotivationPhrase: st.setMotivationPhrase, motivationPhoto: st.motivationPhoto, setMotivationPhoto: st.setMotivationPhoto,
  })));
  const p = s.profile;
  const [f, setF] = useState(() => ({
    name: p?.name ?? '', age: String(p?.age ?? ''), weight: String(p?.weight ?? ''), height: String(p?.height ?? ''), gender: p?.gender ?? '',
    goal: p?.goal ?? '', trainingDaysPerWeek: String(p?.trainingDaysPerWeek ?? 3), sessionMinutes: String(p?.sessionMinutes ?? 45),
    workHours: p?.workHours ?? '', ...(p?.mealTimes ?? { breakfast: '08:00', brunch: '11:30', lunch: '14:00', snack: '18:00', dinner: '21:00' }),
  }));
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  if (!p) return null;
  const save = async () => {
    setSaving(true);
    const patch: Partial<UserProfile> = {
      name: f.name.trim() || p.name, age: Number(f.age) || p.age, weight: Number(String(f.weight).replace(',', '.')) || p.weight,
      height: Number(f.height) || p.height, gender: f.gender, goal: f.goal, workHours: f.workHours,
      trainingDaysPerWeek: Number(f.trainingDaysPerWeek) || p.trainingDaysPerWeek, sessionMinutes: Number(f.sessionMinutes) || p.sessionMinutes,
      mealTimes: { breakfast: f.breakfast, brunch: f.brunch, lunch: f.lunch, snack: f.snack, dinner: f.dinner },
    };
    s.updateProfile(patch);
    try {
      if (s.authToken) await authService.updateProfile(s.authToken, { ...patch, motivationPhrase: s.motivationPhrase });
      Haptics.success();
      s.showToast({ type: 'success', title: 'Cambios guardados ✅' });
    } catch { s.showToast({ type: 'error', title: 'No se pudo guardar', message: 'Reintenta en unos segundos.' }); }
    setSaving(false);
  };
  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onloadend = async () => {
      const photo = r.result as string;
      s.setMotivationPhoto(photo);
      if (s.authToken) { try { await authService.updateProfile(s.authToken, { motivationPhoto: photo }); } catch { /* se reintenta al guardar */ } }
    };
    r.readAsDataURL(file);
  };
  return (<>
    <Card className="gap-3">
      <Field label="Nombre" value={f.name} onChange={set('name')} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Edad" type="number" value={f.age} onChange={set('age')} suffix="años" />
        <Field label="Sexo" value={f.gender} onChange={set('gender')} />
        <Field label="Peso" type="number" value={f.weight} onChange={set('weight')} suffix="kg" />
        <Field label="Altura" type="number" value={f.height} onChange={set('height')} suffix="cm" />
      </div>
      <Field label="Objetivo" value={f.goal} onChange={set('goal')} />
    </Card>
    <Card className="gap-3">
      <div className="t-card" style={txt}>Entreno</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Días / semana" type="number" value={f.trainingDaysPerWeek} onChange={set('trainingDaysPerWeek')} />
        <Field label="Minutos / sesión" type="number" value={f.sessionMinutes} onChange={set('sessionMinutes')} />
      </div>
      <Field label="Horario de trabajo" value={f.workHours} onChange={set('workHours')} />
    </Card>
    <Card className="gap-3">
      <div className="t-card" style={txt}>Horario de comidas</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Desayuno" type="time" value={f.breakfast} onChange={set('breakfast')} />
        <Field label="Media mañana" type="time" value={f.brunch} onChange={set('brunch')} />
        <Field label="Comida" type="time" value={f.lunch} onChange={set('lunch')} />
        <Field label="Merienda" type="time" value={f.snack} onChange={set('snack')} />
        <Field label="Cena" type="time" value={f.dinner} onChange={set('dinner')} />
      </div>
    </Card>
    <Card className="gap-3">
      <div className="t-card" style={txt}>Motivación</div>
      <Field label="Tu frase" value={s.motivationPhrase} onChange={s.setMotivationPhrase} />
      {s.motivationPhoto && <img src={s.motivationPhoto} alt="Foto de inspiración" className="w-full max-h-48 object-cover rounded-[18px]" />}
      <DarkButton text="Subir foto de inspiración" icon="photo_camera" onClick={() => fileRef.current?.click()} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
    </Card>
    <LimeButton text="Guardar cambios" loading={saving} onClick={save} />
  </>);
}

// ─────────────────────────────── Fotos ───────────────────────────────

function Photos() {
  const { photos, addProgressPhoto, authToken, showToast } = useAppStore(useShallow((s) => ({
    photos: s.progressPhotos, addProgressPhoto: s.addProgressPhoto, authToken: s.authToken, showToast: s.showToast,
  })));
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true);
    const r = new FileReader();
    r.onloadend = async () => {
      const photo = { date: new Date().toISOString(), url: r.result as string };
      addProgressPhoto(photo);
      if (authToken) { try { await workoutService.addPhoto(authToken, photo); } catch { showToast({ type: 'error', title: 'No se pudo subir la foto' }); } }
      showToast({ type: 'success', title: 'Foto de progreso guardada 📸' });
      setBusy(false);
    };
    r.readAsDataURL(file);
    e.target.value = '';
  };
  const shown = [...photos].reverse().slice(0, 30);
  return (
    <Card>
      <CardHeader icon="photo_camera" tint="var(--v-accent)" title="Foto de progreso" chevron={false} />
      <div className="h-2" />
      <p className="t-body m-0" style={dim}>{photos.length ? `${photos.length} fotos · toca para ampliar` : 'Tu evolución empieza con una foto'}</p>
      <div className="h-3.5" />
      {!shown.length ? (
        <div className="h-24 rounded-[24px] flex items-center justify-center p-4 text-center t-body" style={{ background: 'var(--v-surface2)', ...dim }}>Sube tu primera foto para comparar tu evolución.</div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
          {shown.map((p) => (
            <button key={p.date} type="button" onClick={() => setPreview(p.url)} className="tap relative w-[104px] h-[140px] rounded-[22px] overflow-hidden shrink-0" style={{ background: 'var(--v-surface2)' }}>
              <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              <span className="absolute bottom-0 left-0 t-label px-2 py-[3px] rounded-tr-[12px]" style={{ color: '#fff', background: 'rgba(0,0,0,0.55)' }}>{p.date.slice(5, 10)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="h-3.5" />
      <div className="grid grid-cols-2 gap-2.5">
        <LimeButton text="Cámara" icon="photo_camera" height={48} enabled={!busy} onClick={() => camRef.current?.click()} />
        <DarkButton text="Galería" icon="photo_library" height={48} className="w-full" onClick={() => galRef.current?.click()} />
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />
      <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {busy && <div className="skeleton h-2 rounded-full mt-2.5" />}
      {preview && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-6 fade-in" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setPreview(null)}>
          <img src={preview} alt="Foto de progreso" className="max-h-[85dvh] max-w-full rounded-[28px] object-contain" />
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────── Logros ───────────────────────────────

function Achievements() {
  const achievements = useAppStore((s) => s.achievements);
  const unlocked = new Map(achievements.map((a) => [a.id, a]));
  const last = achievements[achievements.length - 1];
  return (
    <Card>
      <CardHeader icon="emoji_events" tint="var(--v-accent)" title="Logros" chevron={false} />
      <div className="h-2.5" />
      <div className="flex items-end">
        <span className="t-heroxl" style={{ color: 'var(--v-accent)', fontSize: 40, lineHeight: '44px' }}>{unlocked.size}</span>
        <span className="t-body ml-1 mb-1.5" style={dim}>de {ACHIEVEMENTS_CATALOG.length} desbloqueados</span>
      </div>
      <div className="h-2.5" />
      <Bar value={ACHIEVEMENTS_CATALOG.length ? unlocked.size / ACHIEVEMENTS_CATALOG.length : 0} />
      <div className="h-3.5" />
      <div className="flex flex-wrap gap-2">
        {ACHIEVEMENTS_CATALOG.map((a) => {
          const on = unlocked.has(a.id);
          return (
            <span key={a.id} title={a.description} className="inline-flex items-center rounded-full px-3 py-2"
              style={{ background: on ? 'color-mix(in srgb, var(--v-accent) 14%, transparent)' : 'var(--v-surface2)', boxShadow: `inset 0 0 0 1px ${on ? 'color-mix(in srgb, var(--v-accent) 45%, transparent)' : 'var(--v-border)'}` }}>
              <span style={{ fontSize: 14 }}>{on ? a.icon : '🔒'}</span>
              <span className="ml-1.5" style={{ color: on ? 'var(--v-text)' : 'var(--v-dim)', font: '600 12px/16px var(--font-sans)' }}>{a.label}</span>
            </span>
          );
        })}
      </div>
      {last && <p className="mt-3 mb-0" style={{ ...dim, font: '500 12px/16px var(--font-sans)' }}>Último: {last.icon} {last.description}</p>}
    </Card>
  );
}

function Bar({ value, height = 6, color = 'var(--v-accent)' }: { value: number; height?: number; color?: string }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: 'var(--v-surface2)' }}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

// ─────────────────────────────── Hábitos ───────────────────────────────

function Habits() {
  const { goals, toggle, logs, routine } = useAppStore(useShallow((s) => ({ goals: s.weeklyGoals, toggle: s.toggleWeeklyGoal, logs: s.logs, routine: s.routine })));
  const streak = useMemo(() => computeSmartStreak(logs, routine), [logs, routine]);
  const done = goals.filter((g) => g.done).length;
  return (<>
    <Card>
      <div className="t-label" style={dim}>Racha actual</div>
      <div className="h-1" />
      <ValueUnit value={`${streak}`} unit={streak === 1 ? 'día' : 'días'} valueClass="t-hero" />
    </Card>
    <Card>
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <CardHeader icon="flag" tint="var(--v-accent)" title="Hábitos" chevron={false} />
          <div className="h-2" />
          <div className="t-section" style={{ ...txt, fontSize: 22, lineHeight: '27px' }}>Tu semana, en marcha</div>
          <div className="t-body" style={dim}>Se reinician cada lunes</div>
        </div>
        <div className="relative">
          <MiniDonut progress={goals.length ? done / goals.length : 0} size={76} stroke={6} color="var(--v-accent)" />
          <span className="absolute inset-0 flex items-center justify-center t-value" style={{ ...txt, fontSize: 15 }}>{done}/{goals.length}</span>
        </div>
      </div>
      <div className="h-3" />
      <div className="flex flex-col gap-2">
        {goals.map((g) => (
          <button key={g.id} type="button" role="checkbox" aria-checked={g.done} onClick={() => { Haptics.medium(); toggle(g.id); }}
            className="tap min-h-14 flex items-center rounded-[20px] px-3.5 py-2.5 text-left transition-colors"
            style={{ background: g.done ? 'color-mix(in srgb, var(--v-accent) 14%, var(--v-surface2))' : 'var(--v-surface2)' }}>
            <span className={cx('w-7 h-7 rounded-full flex items-center justify-center shrink-0', g.done && 'pop')}
              style={{ background: g.done ? 'var(--v-accent)' : 'transparent', boxShadow: g.done ? undefined : 'inset 0 0 0 2px color-mix(in srgb, var(--v-dim) 55%, transparent)' }}>
              {g.done && <Icon n="check" size={18} color={ON_ACCENT} />}
            </span>
            <span className="ml-3" style={{ color: g.done ? 'var(--v-text)' : 'var(--v-dim)', font: '600 14px/20px var(--font-sans)' }}>{g.label}</span>
          </button>
        ))}
      </div>
    </Card>
  </>);
}

// ─────────────────────────────── Recuperación ───────────────────────────────

function Recovery() {
  const { recoveryLogs, addRecoveryLog, dailyMetrics, showToast } = useAppStore(useShallow((s) => ({
    recoveryLogs: s.recoveryLogs, addRecoveryLog: s.addRecoveryLog, dailyMetrics: s.dailyMetrics, showToast: s.showToast,
  })));
  const today = dateKey(new Date());
  const todayLog = recoveryLogs.find((l) => l.date === today);
  const m = dailyMetrics[today];
  const [sleep, setSleep] = useState(String(todayLog?.sleepHours ?? m?.sleepHours ?? ''));
  const [hrv, setHrv] = useState(String(todayLog?.hrv ?? m?.hrv ?? ''));
  const score = todayLog?.score ?? null;
  const advice = score != null ? getRecoveryAdvice(score) : null;
  const save = () => {
    const sl = parseFloat(sleep.replace(',', '.'));
    if (!sl || sl <= 0 || sl > 24) { showToast({ type: 'error', title: 'Indica las horas de sueño' }); return; }
    const hv = hrv ? parseFloat(hrv.replace(',', '.')) : undefined;
    const sc = computeRecoveryScore(sl, hv, recoveryLogs.filter((l) => l.date < today));
    addRecoveryLog({ date: today, sleepHours: sl, hrv: hv, score: sc });
    Haptics.success();
    showToast({ type: 'success', title: `Recovery Score: ${sc}/100 💤`, message: getRecoveryAdvice(sc).intensityLabel });
  };
  const tint = score == null ? 'var(--v-dim)' : score < 40 ? 'var(--v-water)' : score < 65 ? '#FFB547' : 'var(--v-accent)';
  return (<>
    <Card>
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <CardHeader icon="self_improvement" o tint="var(--v-water)" title="Recovery Score" chevron={false} />
          <div className="h-2" />
          <div className="t-section" style={{ ...txt, fontSize: 20 }}>{advice ? `${advice.emoji} ${advice.title}` : 'Haz tu check-in matinal'}</div>
          <p className="t-body m-0 mt-1" style={dim}>{advice ? advice.subtitle : 'Con tus horas de sueño (y tu HRV si la mides) ajustamos la intensidad de hoy.'}</p>
        </div>
        <div className="relative ml-3">
          <MiniDonut progress={(score ?? 0) / 100} size={84} stroke={8} color={tint} />
          <span className="absolute inset-0 flex items-center justify-center t-value" style={txt}>{score ?? '—'}</span>
        </div>
      </div>
    </Card>
    <Card className="gap-3">
      <div className="t-card" style={txt}>Check-in de hoy</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sueño" type="number" value={sleep} onChange={setSleep} suffix="h" />
        <Field label="HRV (opcional)" type="number" value={hrv} onChange={setHrv} suffix="ms" />
      </div>
      <LimeButton text={todayLog ? 'Actualizar check-in' : 'Guardar check-in'} onClick={save} />
    </Card>
  </>);
}

// ─────────────────────────────── Informe IA ───────────────────────────────

function Report() {
  const s = useAppStore(useShallow((st) => ({ profile: st.profile, logs: st.logs, routine: st.routine, diet: st.diet, photos: st.progressPhotos, authToken: st.authToken, showToast: st.showToast })));
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ProgressReport | null>(null);
  useEffect(() => {
    if (!loading) return;
    let cur = 0; setProgress(0);
    const id = setInterval(() => { cur = Math.min(85, cur + Math.random() * 6 + 2); setProgress(Math.round(cur)); }, 400);
    return () => clearInterval(id);
  }, [loading]);
  const run = async () => {
    Haptics.medium(); setLoading(true);
    try {
      const r = await generateProgressReport({ profile: s.profile, logs: s.logs, routine: s.routine, diet: s.diet, progressPhotos: s.photos.map((p) => ({ date: p.date })) }, s.authToken);
      setReport(r);
      s.showToast({ type: 'success', title: 'Informe generado', message: 'Revisa tu estado actual y los siguientes pasos recomendados.' });
    } catch (e) {
      s.showToast({ type: 'error', title: 'No se pudo generar el informe', message: (e as Error)?.message || 'Inténtalo de nuevo en unos segundos.' });
    } finally { setLoading(false); }
  };
  const Pill = ({ label, value, color = 'var(--v-text)' }: { label: string; value: string; color?: string }) => (
    <div className="rounded-[18px] p-3" style={{ background: 'var(--v-surface2)' }}>
      <div className="t-label" style={dim}>{label}</div>
      <div className="t-value" style={{ color }}>{value}</div>
    </div>
  );
  return (
    <Card>
      <CardHeader icon="insights" tint="var(--v-accent)" title="Informe IA" chevron={false} />
      <div className="h-2" />
      <div className="t-section" style={{ ...txt, fontSize: 22, lineHeight: '27px' }}>Tu progreso, analizado</div>
      <p className="t-body mt-1 mb-0" style={dim}>Analiza tus historiales de entrenamiento, nutrición y evolución para calcular tu porcentaje de avance y proyección estética.</p>
      <div className="h-3.5" />
      <LimeButton text={loading ? 'Generando informe...' : 'Generar informe con IA'} loading={loading} onClick={run} />
      {loading && (
        <div className="flex flex-col gap-2.5 mt-3.5 fade-in">
          <div className="flex justify-between"><span style={{ ...dim, font: '500 12px/16px var(--font-sans)' }}>Analizando datos biométricos…</span><span className="t-label" style={txt}>{progress}%</span></div>
          <Bar value={progress / 100} height={8} />
          <div className="skeleton h-14 rounded-[20px]" />
          <div className="skeleton h-[84px] rounded-[20px]" />
        </div>
      )}
      {report && !loading && (
        <div className="flex flex-col gap-2.5 mt-4 fade-in">
          <div className="grid grid-cols-2 gap-2">
            <Pill label="Score total" value={`${report.overallScore}%`} />
            <Pill label="Progreso" value={`${report.progressPercent}%`} />
            <Pill label="Consistencia" value={`${report.consistencyPercent}%`} />
            <Pill label="Te falta" value={`${report.weeksToVisibleChange} sem`} />
            {(report.nutritionPercent > 0 || report.trainingExecutionPercent > 0) && (<>
              <Pill label="Nutrición" value={`${report.nutritionPercent}%`} color="var(--v-orange)" />
              <Pill label="Ejecución" value={`${report.trainingExecutionPercent}%`} color="var(--v-water)" />
            </>)}
          </div>
          <div className="rounded-[20px] p-4 t-body" style={{ background: 'var(--v-surface2)', ...txt }}>{report.summary}</div>
          {[['Qué puedes mejorar', report.improvements], ['Siguientes pasos', report.nextActions]].map(([t, items]) => (items as string[])?.length ? (
            <div key={t as string} className="rounded-[20px] p-4" style={{ background: 'var(--v-surface2)' }}>
              <div className="t-label mb-2" style={dim}>{t as string}</div>
              {(items as string[]).map((it, i) => <div key={i} className="flex py-0.5 t-body"><span style={{ color: 'var(--v-accent)' }}>•&nbsp;</span><span style={txt}>{it}</span></div>)}
            </div>
          ) : null)}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────── Salud y sensores ───────────────────────────────

function Health() {
  const dailyMetrics = useAppStore((s) => s.dailyMetrics);
  const showToast = useAppStore((s) => s.showToast);
  const today = dateKey(new Date());
  const m = dailyMetrics[today];
  const synced = Object.keys(dailyMetrics).filter((k) => dailyMetrics[k]?.steps != null).length;
  const [state, setState] = useState<BLEConnectionState>('disconnected');
  const [bpm, setBpm] = useState<number | null>(null);
  const [device, setDevice] = useState<string | null>(null);
  const svc = useRef<BLEHeartRateService | null>(null);
  useEffect(() => () => svc.current?.disconnect(), []);
  const connect = async () => {
    if (!svc.current) svc.current = new BLEHeartRateService((p) => setBpm(p.bpm), (st) => { setState(st); if (st === 'disconnected') { setBpm(null); setDevice(null); } });
    try { await svc.current.connect(); setDevice(svc.current.deviceName); }
    catch (e) { showToast({ type: 'error', title: 'Error Bluetooth', message: (e as Error)?.message || 'No se pudo conectar al sensor.' }); }
  };
  const row = (icon: string, tint: string, label: string, value: string) => (
    <div className="flex items-center py-2">
      <Icon n={icon} o size={18} color={tint} />
      <span className="t-card ml-2.5 flex-1" style={txt}>{label}</span>
      <span className="t-caption" style={dim}>{value}</span>
    </div>
  );
  return (<>
    <Card>
      <CardHeader icon="favorite_border" o tint="var(--v-danger)" title="Datos de salud" chevron={false} />
      <div className="h-2" />
      <p className="t-body m-0" style={dim}>
        Los pasos, sueño, HRV y pulso llegan desde Health Connect (o Samsung Health) a través de la app Android de VoltBody y se sincronizan aquí.
      </p>
      <div className="h-2" />
      {row('directions_walk', 'var(--v-accent)', 'Pasos hoy', m?.steps != null ? fmt(m.steps) : '—')}
      {row('bedtime', 'var(--v-water)', 'Sueño', m?.sleepHours != null ? `${trim(m.sleepHours)} h` : '—')}
      {row('monitor_heart', 'var(--v-accent)', 'HRV', m?.hrv != null ? `${Math.round(m.hrv)} ms` : '—')}
      {row('favorite', 'var(--v-danger)', 'FC en reposo', m?.restingHr != null ? `${m.restingHr} lpm` : '—')}
      <p className="t-caption mt-1 mb-0" style={dim}>{synced ? `${synced} días sincronizados` : 'Aún no hay datos sincronizados.'}</p>
    </Card>
    <Card>
      <CardHeader icon="bluetooth" tint="var(--v-water)" title="Pulsómetro Bluetooth" chevron={false} />
      <div className="h-2.5" />
      <div className="flex items-center">
        <ValueUnit className="flex-1" value={bpm != null ? `${bpm}` : '—'} unit="lpm" valueClass="t-hero" />
        {state === 'connected' && <span className="t-caption" style={{ color: 'var(--v-accent)' }}>{device ?? 'Conectado'}</span>}
      </div>
      <div className="h-3" />
      {!isBLESupported() ? <p className="t-body m-0" style={dim}>Este navegador no admite Bluetooth. Usa Chrome en Android o escritorio.</p>
        : state === 'connected' ? <DarkButton text="Desconectar" icon="bluetooth_disabled" onClick={() => svc.current?.disconnect()} />
        : <LimeButton text={state === 'connecting' ? 'Conectando…' : 'Conectar pulsómetro'} loading={state === 'connecting'} height={50} onClick={connect} />}
    </Card>
  </>);
}

// ─────────────────────────────── Notificaciones ───────────────────────────────

function Notifications() {
  const { enabled, setEnabled, showToast } = useAppStore(useShallow((s) => ({ enabled: s.notificationsEnabled, setEnabled: s.setNotificationsEnabled, showToast: s.showToast })));
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const change = async (on: boolean) => {
    if (on) {
      const granted = await notificationService.requestPermission();
      if (granted) { setEnabled(true); showToast({ type: 'success', title: 'Notificaciones activadas', message: 'Recordatorios de comidas, entreno y peso.' }); }
      else showToast({ type: 'error', title: 'Permiso denegado', message: 'Actívalo en los ajustes del navegador.' });
    } else { setEnabled(false); notificationService.clearAll(); }
  };
  return (
    <Card>
      <div className="flex items-center">
        <div className="flex-1 min-w-0 mr-3">
          <div className="t-section" style={txt}>Recordatorios</div>
          <div className="t-caption" style={dim}>Comidas según tu horario, entreno del día y pesaje semanal.</div>
        </div>
        {supported ? <Toggle checked={enabled} onChange={change} label="Recordatorios" /> : <span className="t-caption" style={dim}>No soportado</span>}
      </div>
    </Card>
  );
}

// ─────────────────────────────── Tema ───────────────────────────────

function Theme() {
  const { theme, setTheme, authToken } = useAppStore(useShallow((s) => ({ theme: s.theme, setTheme: s.setTheme, authToken: s.authToken })));
  const pick = async (t: AppTheme) => {
    Haptics.selection(); setTheme(t);
    if (authToken) { try { await authService.updateProfile(authToken, { theme: t }); } catch { /* se mantiene en el dispositivo */ } }
  };
  return (<>
    {THEMES.map((t) => (
      <button key={t} type="button" onClick={() => pick(t)} aria-pressed={theme === t}
        className="tap w-full flex items-center rounded-[24px] p-4 text-left"
        style={{ background: 'rgba(255,255,255,0.05)', boxShadow: theme === t ? `inset 0 0 0 1.5px ${THEME_ACCENT[t]}` : undefined, ['--tap' as string]: 0.98 } as CSSProperties}>
        <span className="w-9 h-9 rounded-full shrink-0" style={{ background: THEME_ACCENT[t] }} />
        <span className="t-section flex-1 ml-3.5" style={txt}>{themeLabel(t)}</span>
        {theme === t && <Icon n="check" color="var(--v-accent)" label="Activo" />}
      </button>
    ))}
  </>);
}

// ─────────────────────────────── Mis datos ───────────────────────────────

function Data() {
  const s = useAppStore();
  const [confirm, setConfirm] = useState(false);
  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(), user: s.user, profile: s.profile, routine: s.routine, diet: s.diet, logs: s.logs,
      weightLogs: s.weightLogs, mealEatenRecord: s.mealEatenRecord, dailyMetrics: s.dailyMetrics, weeklyGoals: s.weeklyGoals,
      achievements: s.achievements, recoveryLogs: s.recoveryLogs, customWorkout: s.customWorkout,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `voltbody-${dateKey(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
    s.showToast({ type: 'success', title: 'Datos exportados' });
  };
  return (<>
    <Card>
      <CardHeader icon="download" tint="var(--v-accent)" title="Exportar" chevron={false} />
      <p className="t-body mt-2 mb-3" style={dim}>Descarga un archivo con tu perfil, plan, series, peso y hábitos.</p>
      <DarkButton text="Exportar mis datos" icon="download" onClick={exportData} />
    </Card>
    <Card>
      <CardHeader icon="restart_alt" tint="var(--v-danger)" title="Rehacer mi plan" chevron={false} />
      <p className="t-body mt-2 mb-3" style={dim}>Vuelve al cuestionario inicial para crear un plan nuevo desde cero.</p>
      {!confirm ? <DarkButton text="Empezar de nuevo" tint="var(--v-danger)" onClick={() => setConfirm(true)} /> : (
        <div className="flex gap-2">
          <DarkButton text="Cancelar" onClick={() => setConfirm(false)} />
          <DarkButton text="Sí, rehacer" tint="var(--v-danger)" onClick={() => { Haptics.warning(); s.resetApp(); }} />
        </div>
      )}
    </Card>
  </>);
}

// ─────────────────────────────── Plan de comidas ───────────────────────────────

function DietPlanSection() {
  const s = useAppStore(useShallow((st) => ({
    profile: st.profile, authToken: st.authToken, updateProfile: st.updateProfile, setRoutine: st.setRoutine, setDiet: st.setDiet,
    setInsights: st.setInsights, showToast: st.showToast,
  })));
  const prefs = s.profile?.foodPreferences ?? { vegetables: [], carbs: [], proteins: [] };
  const [f, setF] = useState({ vegetables: prefs.vegetables.join(', '), carbs: prefs.carbs.join(', '), proteins: prefs.proteins.join(', ') });
  const [busy, setBusy] = useState<'save' | 'regen' | null>(null);
  const split = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
  const nextPrefs = () => ({ vegetables: split(f.vegetables), carbs: split(f.carbs), proteins: split(f.proteins) });
  const save = async () => {
    setBusy('save');
    const foodPreferences = nextPrefs();
    s.updateProfile({ foodPreferences });
    try { if (s.authToken) await authService.updateProfile(s.authToken, { foodPreferences }); s.showToast({ type: 'success', title: 'Preferencias guardadas' }); }
    catch { s.showToast({ type: 'error', title: 'No se pudo guardar' }); }
    setBusy(null);
  };
  const regenerate = async () => {
    if (!s.profile) return;
    setBusy('regen');
    try {
      const profile = { ...s.profile, foodPreferences: nextPrefs() };
      const plan = await generatePlan(profile, s.authToken);
      const routine = await enrichRoutine(plan.routine, s.authToken);
      s.updateProfile({ foodPreferences: profile.foodPreferences });
      s.setRoutine(routine); s.setDiet(plan.diet); if (plan.insights) s.setInsights(plan.insights);
      if (s.authToken) await authService.updateProfile(s.authToken, { foodPreferences: profile.foodPreferences, routine, diet: plan.diet, insights: plan.insights });
      Haptics.success();
      s.showToast({ type: 'success', title: 'Plan regenerado ✨', message: 'Tu nueva rutina y menú ya están listos.' });
    } catch (e) {
      s.showToast({ type: 'error', title: 'No se pudo regenerar el plan', message: (e as Error)?.message });
    } finally { setBusy(null); }
  };
  return (<>
    <Card className="gap-3">
      <CardHeader icon="restaurant" o tint="var(--v-orange)" title="Tus gustos" chevron={false} />
      <p className="t-caption m-0" style={dim}>Separa los alimentos con comas.</p>
      <Field label="Verduras" value={f.vegetables} onChange={(v) => setF((x) => ({ ...x, vegetables: v }))} />
      <Field label="Hidratos" value={f.carbs} onChange={(v) => setF((x) => ({ ...x, carbs: v }))} />
      <Field label="Proteínas" value={f.proteins} onChange={(v) => setF((x) => ({ ...x, proteins: v }))} />
      <DarkButton text="Guardar preferencias" onClick={save} />
      {busy === 'save' && <Spinner color="var(--v-accent)" />}
    </Card>
    <Card>
      <CardHeader icon="auto_awesome" o tint="var(--v-accent)" title="Regenerar plan" chevron={false} />
      <p className="t-body mt-2 mb-3" style={dim}>Creamos con IA una rutina y un menú semanal nuevos según tu objetivo y tus gustos.</p>
      <LimeButton text={busy === 'regen' ? 'Creando tu plan…' : 'Regenerar con IA'} loading={busy === 'regen'} onClick={regenerate} />
    </Card>
  </>);
}

// ─────────────────────────────── Fatiga muscular ───────────────────────────────

const FATIGUE_COLOR: Record<FatigueEntry['status'], string> = { fresh: '#34D399', moderate: '#FACC15', high: '#FB923C', overreached: '#F87171' };

function Fatigue() {
  const { logs, routine, custom } = useAppStore(useShallow((s) => ({ logs: s.logs, routine: s.routine, custom: s.customWorkout })));
  const entries = useMemo(() => computeFatigueIndex(logs, custom.length ? [...routine, { day: 'custom', focus: 'custom', exercises: custom }] : routine), [logs, routine, custom]);
  if (!entries.length) return <Card><p className="t-body m-0" style={dim}>Registra series esta semana para ver tu volumen por grupo muscular.</p></Card>;
  return (<>
    {entries.map((e) => (
      <Card key={e.muscleGroup}>
        <div className="flex items-center">
          <span className="t-card flex-1" style={txt}>{e.muscleGroup}</span>
          <span className="t-caption" style={{ color: FATIGUE_COLOR[e.status] }}>{fatigueStatusLabel(e.status)}</span>
        </div>
        <div className="h-2" />
        <Bar value={Math.max(0.02, Math.min(1, e.percent / 100))} height={8} color={FATIGUE_COLOR[e.status]} />
        <div className="t-caption mt-1" style={dim}>{e.weeklyVolume} de {e.mrv} series semanales ({e.percent}%)</div>
      </Card>
    ))}
  </>);
}

// ─────────────────────────────── Rutina personal ───────────────────────────────

function Library() {
  const s = useAppStore(useShallow((st) => ({ custom: st.customWorkout, library: st.exerciseLibrary, add: st.addToCustomWorkout, remove: st.removeFromCustomWorkout })));
  const replace = useNav((n) => n.replace);
  const groups = useMemo(() => {
    const m = new Map<string, typeof s.library>();
    s.library.forEach((e) => (m.get(e.muscleGroup) ?? m.set(e.muscleGroup, []).get(e.muscleGroup)!).push(e));
    return [...m.entries()];
  }, [s.library]);
  return (<>
    {s.custom.length > 0 && <LimeButton text="Entrenar rutina personal" icon="play_arrow" onClick={() => replace({ kind: 'session', weekday: -1, start: 0, custom: true })} />}
    {s.custom.map((ex) => (
      <div key={ex.id} className="flex items-center rounded-[20px] p-3.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="flex-1 min-w-0">
          <div className="t-card truncate" style={txt}>{ex.name}</div>
          <div className="t-caption truncate" style={dim}>{setsLabel(ex)} · {ex.muscleGroup}</div>
        </div>
        <IconCircle icon="close" size={34} label="Quitar" onClick={() => s.remove(ex.id)} />
      </div>
    ))}
    <SectionLabel text="Biblioteca" />
    {groups.map(([group, items]) => (
      <div key={group} className="flex flex-col gap-2">
        <div className="t-label pl-1 pt-1" style={dim}>{group}</div>
        {items.map((e) => {
          const added = s.custom.some((c) => c.id === e.id);
          return (
            <button key={e.id} type="button" onClick={() => { if (!added) { Haptics.medium(); s.add(e); } }}
              className="tap w-full flex items-center rounded-[20px] p-3.5 text-left" style={{ background: 'rgba(255,255,255,0.05)', ['--tap' as string]: 0.98 } as CSSProperties}>
              <span className="flex-1 min-w-0">
                <span className="t-card block truncate" style={txt}>{e.name}</span>
                <span className="t-caption block" style={dim}>{e.defaultSets} × {e.defaultReps}</span>
              </span>
              <Icon n={added ? 'check' : 'add'} color="var(--v-accent)" />
            </button>
          );
        })}
      </div>
    ))}
  </>);
}

