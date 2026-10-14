/** Reproductor de entreno (espejo de ui/v3/SessionV3.kt). */
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, type WorkoutLog } from '../../store/useAppStore';
import { Haptics } from '../../lib/haptics';
import { getProgressiveSuggestion } from '../../lib/progressiveOverload';
import { checkNewAchievements } from '../../lib/achievements';
import { computeSmartStreak } from '../../lib/routineWeek';
import type { WorkoutSummaryData } from '../../components/WorkoutSummaryCard';
import {
  ConfettiBurst, ExerciseImage, FitText, GlassSheet, Icon, IconCircle, LimeButton, ON_ACCENT, SheetScaffold, SmallPill, Stepper,
  TopBar, WaveLine, gymTerm, trim, useAccent,
} from '../kit';
import { exerciseTypeOf, firstInt, logDateKey, dateKey, mapRoutineByWeekday, setsLabel } from '../data';
import { useNav, type Route } from '../nav';

const WorkoutSummaryCard = lazy(() => import('../../components/WorkoutSummaryCard'));
const WeightCalculator = lazy(() => import('../../components/WeightCalculator'));

const XP_PER_LOG = 12, XP_PER_STREAK_DAY = 8, XP_PER_LEVEL = 250;
const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export default function Session({ route }: { route: Extract<Route, { kind: 'session' }> }) {
  const s = useAppStore(useShallow((st) => ({
    logs: st.logs, achievements: st.achievements, addLog: st.addLog, addAchievement: st.addAchievement, showToast: st.showToast,
    profile: st.profile, routine: st.routine,
  })));
  const { push, pop } = useNav(useShallow((n) => ({ push: n.push, pop: n.pop })));

  // La lista de ejercicios se fija al entrar.
  const [{ exercises, title }] = useState(() => {
    const st = useAppStore.getState();
    if (route.custom) return { exercises: st.customWorkout, title: 'Rutina personal' };
    const d = mapRoutineByWeekday(st.routine)[route.weekday];
    return { exercises: d?.exercises ?? [], title: gymTerm(d?.focus || 'Workout') };
  });
  useEffect(() => {
    if (!exercises.length) { s.showToast({ type: 'info', title: 'Sin ejercicios', message: 'Añade ejercicios a la rutina.' }); pop(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const todayKey = dateKey(new Date());
  const startMs = useRef(Date.now()).current;
  const [idx, setIdx] = useState(Math.min(Math.max(0, route.start ?? 0), Math.max(0, exercises.length - 1)));
  const ex = exercises[idx];
  const type = ex ? exerciseTypeOf(ex) : 'weighted';
  const todayLogs = useMemo(() => s.logs.filter((l) => logDateKey(l.date) === todayKey), [s.logs, todayKey]);
  const doneSets = ex ? todayLogs.filter((l) => l.exerciseId === ex.id).length : 0;

  // Historial por sesión (peso máximo o duración máxima)
  const history = useMemo(() => {
    if (!ex) return [] as number[];
    const by = new Map<string, WorkoutLog[]>();
    s.logs.filter((l) => l.exerciseId === ex.id).forEach((l) => { const k = logDateKey(l.date); (by.get(k) ?? by.set(k, []).get(k)!).push(l); });
    return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8)
      .map(([, ls]) => (type === 'isometric' || type === 'cardio' ? Math.max(...ls.map((l) => l.duration ?? 0)) : Math.max(...ls.map((l) => l.weight))));
  }, [s.logs, ex, type]);

  // Valores editables de la serie actual (se reinician al cambiar de ejercicio)
  const [inp, setInp] = useState({ weight: 0, reps: 10, rir: 2, seconds: 30, rpe: 7, minutes: 20 });
  useEffect(() => {
    if (!ex) return;
    const st = useAppStore.getState();
    const last = [...st.logs].reverse().find((l) => l.exerciseId === ex.id);
    const sug = getProgressiveSuggestion(ex.id, st.logs)?.suggestedWeight;
    setInp({
      weight: sug ?? last?.weight ?? (type === 'weighted' ? ex.weight || 0 : 0),
      reps: last?.reps || firstInt(ex.reps, 10), rir: last?.rir ?? 2,
      seconds: ex.durationTarget ?? last?.duration ?? firstInt(ex.reps, 30), rpe: last?.rpe ?? 7,
      minutes: last?.duration ? Math.round(last.duration / 60) : firstInt(ex.reps, 20),
    });
  }, [ex?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const upd = (patch: Partial<typeof inp>) => setInp((v) => ({ ...v, ...patch }));

  const [restEnd, setRestEnd] = useState(0);
  const [restTotal, setRestTotal] = useState(90);
  const resting = restEnd > 0;
  const [confetti, setConfetti] = useState(0);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<WorkoutSummaryData | null>(null);
  const [calc, setCalc] = useState(false);

  // Fin automático del descanso
  useEffect(() => {
    if (!restEnd) return;
    const id = setTimeout(() => { setRestEnd(0); Haptics.heavy(); }, Math.max(0, restEnd - Date.now()));
    return () => clearTimeout(id);
  }, [restEnd]);

  if (!ex) return null;

  const goTo = (i: number) => { if (i >= 0 && i < exercises.length && i !== idx) { Haptics.selection(); setIdx(i); setRestEnd(0); } };

  const finish = () => {
    const st = useAppStore.getState();
    const ids = new Set(exercises.map((e) => e.id));
    const logsToday = st.logs.filter((l) => logDateKey(l.date) === todayKey && ids.has(l.exerciseId));
    const streak = computeSmartStreak(st.logs, st.routine);
    const xp = st.logs.length * XP_PER_LOG + streak * XP_PER_STREAK_DAY;
    Haptics.heavy();
    setSummary({
      focus: title, exerciseCount: exercises.length, completedSets: logsToday.length,
      plannedSets: exercises.reduce((a, e) => a + (e.sets || 0), 0), streak, level: Math.floor(xp / XP_PER_LEVEL) + 1,
      totalXP: xp, xpGained: logsToday.length * XP_PER_LOG, userName: st.profile?.name,
      exercises: exercises.map((e) => ({ name: e.name, sets: logsToday.filter((l) => l.exerciseId === e.id).length, reps: e.reps })),
    });
  };

  const saveSet = async () => {
    if (saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const log: WorkoutLog = type === 'isometric' ? { date: now, exerciseId: ex.id, weight: inp.weight, reps: 1, duration: inp.seconds, rpe: inp.rpe }
      : type === 'cardio' ? { date: now, exerciseId: ex.id, weight: 0, reps: 1, duration: inp.minutes * 60 }
      : { date: now, exerciseId: ex.id, weight: type === 'bodyweight' && inp.weight === 0 ? 0 : inp.weight, reps: inp.reps, rir: inp.rir };
    const isPr = type === 'weighted' && history.length > 0 && inp.weight > Math.max(...history);
    const before = useAppStore.getState().logs;
    try {
      await s.addLog(log);
    } catch {
      s.showToast({ type: 'error', title: 'No se pudo guardar la serie', message: 'Comprueba tu conexión.' });
      setSaving(false);
      return;
    }
    setSaving(false);
    const fresh = checkNewAchievements([...before, log], useAppStore.getState().achievements.map((a) => a.id), ex.id, log.weight);
    fresh.forEach((a) => s.addAchievement({ ...a, unlockedAt: new Date().toISOString() }));
    if (isPr) { Haptics.success(); setConfetti((c) => c + 1); s.showToast({ type: 'success', title: '¡Nuevo PR! 🏆', message: `${trim(inp.weight)} kg en ${ex.name}` }); }
    else if (fresh.length) s.showToast({ type: 'success', title: 'Logro desbloqueado', message: fresh[0].label });
    else Haptics.medium();
    const nowDone = doneSets + 1;
    if (nowDone >= ex.sets && idx === exercises.length - 1) { finish(); return; }
    const total = type === 'isometric' || type === 'cardio' ? 45 : type === 'bodyweight' ? 75 : 90;
    setRestTotal(total);
    setRestEnd(Date.now() + total * 1000);
    if (nowDone >= ex.sets) setIdx((i) => i + 1);
  };

  const technique = ex.technique?.split('\n')[0]?.replace(/^1\.\s*/, '');
  const shownHistory = history.slice(-6);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center px-5 pt-[calc(8px+env(safe-area-inset-top))] pb-[calc(12px+env(safe-area-inset-bottom))]
      md:max-w-[1100px] md:mx-auto md:px-8 md:pt-8">
      <div className="w-full">
        <TopBar title={title} onBack={pop} trailing={(
          <div className="flex items-center gap-2">
            <IconCircle icon="camera_alt" o size={40} label="PoseCoach" onClick={() => push({ kind: 'pose', exercise: ex.name })} />
            <SmallPill text="Terminar" onClick={finish} />
          </div>
        )} />
      </div>
      <div className="h-2.5" />
      {/* Progreso de ejercicios (segmentos tocables) */}
      <div className="flex w-full gap-1">
        {exercises.map((e, i) => {
          const done = todayLogs.filter((l) => l.exerciseId === e.id).length >= e.sets;
          return (
            <button key={`${e.id}-${i}`} type="button" aria-label={`Ejercicio ${i + 1}: ${e.name}`} onClick={() => goTo(i)}
              className="flex-1 h-[5px] rounded-[3px] transition-colors"
              style={{ background: i === idx ? 'var(--v-accent)' : done ? 'color-mix(in srgb, var(--v-accent) 45%, transparent)' : 'var(--v-surface2)' }} />
          );
        })}
      </div>
      <div className="h-2.5" />

      <div className="flex-1 w-full flex flex-col items-center md:grid md:grid-cols-2 md:gap-10 md:items-center">
        <div className="flex flex-col items-center">
          <Ticker startMs={startMs} restEnd={restEnd} />
          <div className="h-1.5" />
          {/* Anillo con la figura del ejercicio */}
          <div className="relative w-[272px] h-[272px] md:w-[340px] md:h-[340px] flex items-center justify-center">
            <SessionRing progress={resting ? -1 : doneSets / Math.max(1, ex.sets)} restEnd={restEnd} restTotal={restTotal} />
            <div key={ex.id} className="relative w-[210px] h-[210px] md:w-[262px] md:h-[262px] rounded-full overflow-hidden flex items-center justify-center pop"
              style={{ background: 'var(--v-surface)' }}>
              <ExerciseImage url={ex.gifUrl} iconSize={64} eager />
            </div>
            <ConfettiBurst burst={confetti} />
          </div>
          <div className="h-3" />
          <div key={ex.id} className="flex flex-col items-center fade-in w-full">
            <FitText text={ex.name} className="t-section text-center" color="var(--v-text)" maxLines={2} style={{ fontSize: 19 }} />
            <p className="t-caption text-center m-0 line-clamp-2 whitespace-pre-line" style={{ color: 'var(--v-dim)' }}>
              {resting ? `Descansa · siguiente serie ${Math.min(doneSets + 1, ex.sets)} de ${ex.sets}`
                : `Serie ${Math.min(doneSets + 1, ex.sets)} de ${ex.sets} · ${setsLabel(ex)}${technique ? `\n${technique}` : ''}`}
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col flex-1 md:flex-none">
          <div className="h-3.5" />
          {/* Registro de la serie */}
          <div className="flex w-full gap-2.5">
            {type === 'isometric' && (<>
              <Stepper className="flex-1" label="Segundos" value={`${inp.seconds}`} onMinus={() => upd({ seconds: Math.max(5, inp.seconds - 5) })} onPlus={() => upd({ seconds: inp.seconds + 5 })} />
              <Stepper className="flex-1" label="RPE" value={`${inp.rpe}`} onMinus={() => upd({ rpe: Math.max(1, inp.rpe - 1) })} onPlus={() => upd({ rpe: Math.min(10, inp.rpe + 1) })} />
            </>)}
            {type === 'cardio' && (
              <Stepper className="flex-1" label="Minutos" value={`${inp.minutes}`} onMinus={() => upd({ minutes: Math.max(1, inp.minutes - 1) })} onPlus={() => upd({ minutes: inp.minutes + 1 })} />
            )}
            {(type === 'weighted' || type === 'bodyweight') && (<>
              <div className="flex-1 min-w-0 relative">
                <Stepper className="w-full h-full" label={type === 'bodyweight' ? 'Lastre kg' : 'Peso kg'} value={trim(inp.weight)}
                  onMinus={() => upd({ weight: Math.max(0, inp.weight - 2.5) })} onPlus={() => upd({ weight: inp.weight + 2.5 })} />
                {type === 'weighted' && (
                  <button type="button" aria-label="Calculadora de discos" title="Calculadora de discos" onClick={() => setCalc(true)}
                    className="absolute top-1.5 right-2 tap"><Icon n="calculate" o size={14} color="var(--v-dim)" /></button>
                )}
              </div>
              <Stepper className="flex-1" label="Reps" value={`${inp.reps}`} onMinus={() => upd({ reps: Math.max(1, inp.reps - 1) })} onPlus={() => upd({ reps: Math.min(200, inp.reps + 1) })} />
              <Stepper style={{ flex: 0.8 }} label="RIR" value={`${inp.rir}`} onMinus={() => upd({ rir: Math.max(0, inp.rir - 1) })} onPlus={() => upd({ rir: Math.min(5, inp.rir + 1) })} />
            </>)}
          </div>
          <div className="h-3" />

          {/* Curva de progreso */}
          <div className="flex-1 w-full flex flex-col justify-center min-h-[90px] md:flex-none md:py-8">
            {shownHistory.length < 2 ? (
              <p className="t-caption text-center m-0" style={{ color: 'var(--v-dim)' }}>Tu progreso aparecerá aquí tras dos sesiones.</p>
            ) : (
              <>
                <WaveLine values={shownHistory} height={46} color="var(--v-water)" />
                <div className="h-1" />
                <div className="flex justify-between">
                  {[shownHistory[0], shownHistory[Math.floor(shownHistory.length / 2)], shownHistory[shownHistory.length - 1]].map((v, i) => (
                    <span key={i} className="t-caption" style={{ color: i === 2 ? 'var(--v-text)' : 'var(--v-dim)' }}>{trim(v)} {type === 'weighted' || type === 'bodyweight' ? 'kg' : 's'}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Controles: anterior · acción principal · siguiente */}
          <div className="flex w-full items-center justify-between">
            <IconCircle icon="chevron_left" size={54} label="Anterior" tint={idx > 0 ? 'var(--v-text)' : 'var(--v-dim)'} onClick={() => goTo(idx - 1)} />
            <div className="flex items-center gap-2.5">
              {resting && <SmallPill text="+15 s" onClick={() => { setRestEnd((e) => e + 15000); setRestTotal((t) => t + 15); }} />}
              <button type="button" aria-label={resting ? 'Saltar descanso' : 'Guardar serie'} disabled={saving}
                onClick={() => { if (resting) { setRestEnd(0); Haptics.light(); } else saveSet(); }}
                className="tap w-[76px] h-[76px] rounded-full flex items-center justify-center" style={{ background: 'var(--v-accent)', ['--tap' as string]: 0.9 } as CSSProperties}>
                <Icon n={resting ? 'skip_next' : 'check'} size={34} color={ON_ACCENT} />
              </button>
            </div>
            <IconCircle icon="chevron_right" size={54} label="Siguiente" tint={idx < exercises.length - 1 ? 'var(--v-text)' : 'var(--v-dim)'} onClick={() => goTo(idx + 1)} />
          </div>
        </div>
      </div>

      {calc && (
        <GlassSheet onDismiss={() => setCalc(false)} label="Calculadora de discos">
          <SheetScaffold title="Calculadora" eyebrow={ex.name}>
            <Suspense fallback={null}>
              <WeightCalculator exerciseId={ex.id} exerciseName={ex.name} targetWeight={ex.weight} userBodyweight={s.profile?.weight}
                onWeightChange={(w) => upd({ weight: w })} />
            </Suspense>
          </SheetScaffold>
        </GlassSheet>
      )}

      {summary && <SummaryDialog data={summary} onDismiss={() => { setSummary(null); pop(); }} />}
    </div>
  );
}

/** Texto del cronómetro (sesión o descanso). */
function Ticker({ startMs, restEnd }: { startMs: number; restEnd: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  const resting = restEnd > now;
  return (
    <div className="flex items-center">
      <span className="t-label" style={{ color: resting ? 'var(--v-accent)' : 'var(--v-dim)' }}>{resting ? 'Descanso' : 'Sesión'}</span>
      <span className="t-section tnum ml-2" style={{ color: 'var(--v-text)', fontSize: 18 }}>
        {mmss(resting ? Math.floor((restEnd - now) / 1000) + 1 : Math.floor((now - startMs) / 1000))}
      </span>
    </div>
  );
}

/** Anillo: progreso de series, o cuenta atrás del descanso. Órbita punteada exterior. */
function SessionRing({ progress, restEnd, restTotal }: { progress: number; restEnd: number; restTotal: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const accent = useAccent();
  const anim = useRef(0);
  useEffect(() => {
    const cv = ref.current; const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let raf = 0; const from = anim.current; const t0 = performance.now();
    const draw = (now: number) => {
      const W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const scale = W / 272;
      const sw = 10 * scale, min = Math.min(W, H), d = min - sw - 16 * scale, r = d / 2, cx = W / 2, cy = H / 2;
      ctx.setLineDash([4 * scale, 6 * scale]); ctx.lineWidth = 1 * scale; ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath(); ctx.arc(cx, cy, min / 2 - scale, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = sw; ctx.strokeStyle = '#212121'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      let p: number;
      if (restEnd > 0) p = Math.min(1, Math.max(0, (restEnd - Date.now()) / (restTotal * 1000)));
      else { const k = Math.min(1, (now - t0) / 500); const e = 1 - Math.pow(1 - k, 3); p = from + (Math.max(0, Math.min(1, progress)) - from) * e; anim.current = p; }
      if (p > 0.001) {
        ctx.strokeStyle = accent; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
        const ang = -Math.PI / 2 + Math.PI * 2 * p;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + r * Math.cos(ang), cy + r * Math.sin(ang), sw * 0.42, 0, Math.PI * 2); ctx.fill();
      }
      if (restEnd > 0 ? Date.now() < restEnd : now - t0 < 520) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [progress, restEnd, restTotal, accent]);
  return <canvas ref={ref} aria-hidden className="absolute inset-0 w-full h-full" />;
}

/** Resumen final a pantalla completa: tarjeta compartible + compartir/cerrar. */
function SummaryDialog({ data, onDismiss }: { data: WorkoutSummaryData; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const showToast = useAppStore((st) => st.showToast);
  const share = async () => {
    if (sharing || !ref.current) return;
    setSharing(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(ref.current, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
      const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
      const file = new File([blob], 'voltbody-sesion.png', { type: 'image/png' });
      const text = `Acabo de completar "${data.focus}" (${data.exerciseCount} ejercicios) en VoltBody 🔥`;
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'VoltBody – Sesión completada', text });
      else if (navigator.share) await navigator.share({ title: 'VoltBody – Sesión completada', text });
      else { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'voltbody-sesion.png'; a.click(); URL.revokeObjectURL(url); }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') showToast({ type: 'error', title: 'Error al compartir', message: 'No se pudo generar la imagen.' });
    } finally { setSharing(false); }
  };
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto fade-in" style={{ background: 'var(--v-bg)' }} role="dialog" aria-modal="true" aria-label="Entreno completado">
      <div className="max-w-[520px] mx-auto px-5 py-3 pt-[calc(12px+env(safe-area-inset-top))] flex flex-col items-center">
        <div className="flex items-center w-full">
          <h1 className="t-screen flex-1 m-0" style={{ color: 'var(--v-text)', fontSize: 32, lineHeight: '36px' }}>¡Entreno completado!</h1>
          <IconCircle icon="close" size={46} label="Cerrar" bg="var(--v-surface)" onClick={onDismiss} />
        </div>
        <div className="h-4" />
        <div className="w-full pop overflow-hidden rounded-[36px]">
          <Suspense fallback={<div className="skeleton h-[420px] rounded-[36px]" />}>
            <WorkoutSummaryCard ref={ref} data={data} />
          </Suspense>
        </div>
        <div className="h-5" />
        <LimeButton text={sharing ? 'Generando tarjeta...' : 'Compartir logro'} loading={sharing} onClick={share} />
        <button type="button" onClick={onDismiss} className="tap w-full p-3.5 mt-2.5" style={{ color: 'var(--v-dim)', font: '700 17px/22px var(--font-sans)' }}>Cerrar</button>
      </div>
    </div>
  );
}
