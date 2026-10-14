/** Inicio (espejo de ui/v3/HomeV3.kt). */
import { useMemo, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { computeSmartStreak } from '../../lib/routineWeek';
import { Haptics } from '../../lib/haptics';
import {
  Card, CardHeader, ExerciseImage, FitText, Icon, MiniDonut, MixTitle, MockBars, ON_ACCENT, Screen, SectionLabel,
  SmallPill, ValueUnit, addDays, enter, fmt, fmt1, gymTerm, trim, cx,
} from '../kit';
import { MIN_PER_EXERCISE, dateKey, logDateKey, mapRoutineByWeekday, mealsFor, mondayFirstIndex } from '../data';
import { goTab, useNav } from '../nav';

function greeting(streak: number, hasRoutine: boolean) {
  const h = new Date().getHours();
  const base = h < 6 ? 'Noche de campeones' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  if (streak >= 3) return `${base} · racha de ${streak} días, no la rompas`;
  if (hasRoutine) return `${base} · hoy toca darlo todo`;
  return `${base} · hoy recargas pilas`;
}

export default function Home() {
  const s = useAppStore(useShallow((st) => ({
    profile: st.profile, user: st.user, profilePhoto: st.profilePhoto, routine: st.routine, diet: st.diet, logs: st.logs,
    insights: st.insights, motivationPhrase: st.motivationPhrase, mealEatenRecord: st.mealEatenRecord, dailyMetrics: st.dailyMetrics,
    weightLogs: st.weightLogs, recoveryLogs: st.recoveryLogs, saveMetrics: st.saveMetrics,
  })));
  const push = useNav((n) => n.push);
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);
  const todayIdx = mondayFirstIndex(today);

  const u = useMemo(() => {
    const day = mapRoutineByWeekday(s.routine)[todayIdx];
    const exercises = day?.exercises ?? [];
    const doneIds = new Set(s.logs.filter((l) => logDateKey(l.date) === todayKey).map((l) => l.exerciseId));
    const eaten = s.mealEatenRecord[todayKey] ?? [];
    const consumed = mealsFor(s.diet, today).filter((m) => eaten.includes(m.id)).reduce((a, m) => a + m.calories, 0);
    const pastSteps = Array.from({ length: 6 }, (_, i) => s.dailyMetrics[dateKey(addDays(today, i - 6))]?.steps ?? 0);
    const anySteps = Array.from({ length: 30 }, (_, i) => s.dailyMetrics[dateKey(addDays(today, -i))]?.steps).some((v) => (v ?? 0) > 0);
    return {
      name: (s.profile?.name ?? s.user?.name ?? 'atleta').split(' ')[0],
      hasRoutine: !!day && exercises.length > 0,
      focus: day?.focus ?? null,
      exercises,
      completion: exercises.length ? Math.round((exercises.filter((e) => doneIds.has(e.id)).length / exercises.length) * 100) : 0,
      consumed, target: s.diet?.dailyCalories ?? 0,
      water: s.dailyMetrics[todayKey]?.waterMl ?? 0,
      steps: s.dailyMetrics[todayKey]?.steps ?? 0,
      distance: s.dailyMetrics[todayKey]?.distanceKm ?? 0,
      pastSteps, anySteps,
      streak: computeSmartStreak(s.logs, s.routine),
      recovery: s.recoveryLogs.find((r) => r.date === todayKey) ?? null,
      weight: s.weightLogs.length ? s.weightLogs[s.weightLogs.length - 1].weight : null,
      quote: s.insights?.dailyQuote || s.motivationPhrase,
    };
  }, [s, today, todayKey, todayIdx]);

  const week = useMemo(() => [...u.pastSteps, u.steps], [u.pastSteps, u.steps]);
  const [sel, setSel] = useState(week.length - 1);
  const selSteps = week[sel] ?? 0;
  const km = sel === week.length - 1 ? (u.distance > 0 ? u.distance : u.steps * 0.00075) : selSteps * 0.00075;

  const setWater = (ml: number) => s.saveMetrics(todayKey, { waterMl: Math.max(0, ml) });
  const first = u.exercises[0];

  return (
    <Screen>
      {/* Cabecera */}
      <header className={cx('flex items-center w-full', enter(0).className)} style={enter(0).style}>
        <div className="flex-1 min-w-0">
          <p className="t-hello m-0 truncate" style={{ color: 'var(--v-dim)' }}>{greeting(u.streak, u.hasRoutine)}</p>
          <MixTitle text={`Hola, ${u.name}`} maxLines={1} />
        </div>
        <button type="button" aria-label="Perfil" onClick={() => goTab('profile')}
          className="tap md:hidden w-[46px] h-[46px] rounded-full overflow-hidden flex items-center justify-center t-section shrink-0"
          style={{ background: 'var(--v-surface2)', color: 'var(--v-accent)', ['--tap' as string]: 0.9 } as CSSProperties}>
          {s.profilePhoto ? <img src={s.profilePhoto} alt="" className="w-full h-full object-cover" /> : u.name.slice(0, 1).toUpperCase()}
        </button>
      </header>

      {/* Banner de energía */}
      <button type="button" onClick={() => { Haptics.light(); goTab('train'); }}
        className={cx('tap w-full rounded-[24px] flex items-center px-3.5 py-4 text-left', enter(1).className)}
        style={{ background: 'var(--v-accent)', ['--tap' as string]: 0.98, ...enter(1).style } as CSSProperties}>
        <span className="w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0" style={{ background: '#0A0A0A' }}>
          <Icon n="bolt" size={24} color="var(--v-accent)" />
        </span>
        <span className="flex-1 min-w-0 ml-3">
          <FitText text={u.hasRoutine ? gymTerm(u.focus || 'Workout') : 'Recarga y muévete'} className="t-display" color={ON_ACCENT}
            maxLines={2} minScale={0.8} style={{ fontSize: 17, lineHeight: '22px' }} />
          <span className="t-caption block truncate" style={{ color: 'rgba(10,10,10,0.72)' }}>{u.quote}</span>
        </span>
        {u.hasRoutine && <Icon n="play_arrow" size={26} color={ON_ACCENT} />}
      </button>

      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 md:items-start">
        <div className="flex flex-col gap-3 md:gap-4">
          <SectionLabel text="Tus estadísticas" {...enter(2)} />

          {/* Pasos */}
          <Card onClick={() => goTab('activity')} label="Pasos" {...enter(3)}>
            <CardHeader icon="directions_walk" tint="var(--v-accent)" title="Pasos"
              trailing={!u.anySteps ? <span onClick={(e) => e.stopPropagation()}><SmallPill text="Conectar" onClick={() => push({ kind: 'section', id: 'health' })} /></span> : undefined} />
            <div className="h-2.5" />
            <div className="flex items-end gap-[22px]">
              <ValueUnit value={fmt(selSteps)} unit="Pasos" unitBelow valueClass="t-hero" />
              <ValueUnit value={fmt1(km)} unit="km" unitBelow />
            </div>
            <div className="h-2.5" />
            <MockBars values={week} highlight={sel} bubble={fmt(selSteps)} onSelect={setSel} />
          </Card>

          {/* Calorías + Agua */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 enter" style={enter(4).style}>
            <Card onClick={() => goTab('food')} label="Calorías">
              <CardHeader icon="local_fire_department" tint="var(--v-orange)" title="Calorías" />
              <div className="h-3" />
              <div className="flex items-center">
                <ValueUnit className="flex-1" value={fmt(u.consumed)} unit={`de ${fmt(u.target)} kcal`} unitBelow />
                <MiniDonut progress={u.target > 0 ? u.consumed / u.target : 0} />
              </div>
            </Card>
            <Card>
              <CardHeader icon="water_drop" tint="var(--v-water)" title="Agua" chevron={false} />
              <div className="h-3" />
              <div className="flex items-center">
                <ValueUnit className="flex-1" value={fmt(u.water)} unit="ml" unitBelow />
                <WaterStep icon="remove" label="Quitar 250 ml" bg="var(--v-surface2)" tint="var(--v-dim)" enabled={u.water > 0} onClick={() => setWater(u.water - 250)} />
                <span className="w-1.5" />
                <WaterStep icon="add" label="Añadir 250 ml" bg="var(--v-water)" tint={ON_ACCENT} onClick={() => setWater(u.water + 250)} />
              </div>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:gap-4">
          {/* Entreno de hoy */}
          <SectionLabel text="Entreno de hoy" action="Ver semana" onAction={() => goTab('train')} {...enter(5)} />
          <Card padding={10} onClick={() => (u.hasRoutine ? push({ kind: 'day', weekday: todayIdx }) : goTab('train'))} label="Entreno de hoy" {...enter(6)}>
            <div className="flex items-center">
              <div className="w-[92px] h-[78px] rounded-[18px] overflow-hidden flex items-center justify-center shrink-0" style={{ background: 'var(--v-surface2)' }}>
                <ExerciseImage url={first?.gifUrl} />
              </div>
              <div className="flex-1 min-w-0 ml-3.5">
                <FitText text={u.hasRoutine ? gymTerm(u.focus || 'Workout') : 'Día de descanso'} className="t-section" color="var(--v-text)" maxLines={2} minScale={0.8} />
                <div className="t-caption truncate" style={{ color: 'var(--v-dim)' }}>
                  {u.hasRoutine ? `${u.exercises.length} ejercicios · ${u.exercises.length * MIN_PER_EXERCISE} min` : 'Recupera o arma una sesión libre'}
                </div>
                {u.hasRoutine && (
                  <div className="mt-2 w-[90%] h-[5px] rounded-[3px] overflow-hidden" style={{ background: 'var(--v-surface2)' }}>
                    <div className="h-full rounded-[3px] transition-[width] duration-500" style={{ width: `${u.completion}%`, background: 'var(--v-accent)' }} />
                  </div>
                )}
              </div>
              <span className="w-11 h-11 rounded-full flex items-center justify-center ml-2.5 shrink-0" style={{ background: 'var(--v-accent)' }}>
                <Icon n="play_arrow" color={ON_ACCENT} label="Empezar" />
              </span>
            </div>
          </Card>

          {/* Accesos rápidos */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 enter" style={enter(7).style}>
            <QuickTile icon="self_improvement" label="Recovery" value={u.recovery ? `${u.recovery.score}` : 'Check-in'} tint="var(--v-water)" onClick={() => push({ kind: 'section', id: 'recovery' })} />
            <QuickTile icon="monitor_weight" label="Peso" value={u.weight != null ? `${trim(u.weight)} kg` : 'Añadir'} tint="var(--v-water)" onClick={() => push({ kind: 'section', id: 'weight' })} />
            <QuickTile icon="whatshot" label="Racha" value={u.streak === 1 ? '1 día' : `${u.streak} días`} tint="var(--v-orange)" onClick={() => push({ kind: 'section', id: 'habits' })} />
          </div>
        </div>
      </div>
    </Screen>
  );
}

function WaterStep({ icon, label, bg, tint, enabled = true, onClick }: { icon: string; label: string; bg: string; tint: string; enabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} disabled={!enabled} onClick={() => { Haptics.medium(); onClick(); }}
      className={cx('w-10 h-10 rounded-full flex items-center justify-center shrink-0', enabled && 'tap')}
      style={{ background: enabled ? bg : 'var(--v-surface2)', ['--tap' as string]: 0.9 } as CSSProperties}>
      <Icon n={icon} size={20} color={enabled ? tint : 'color-mix(in srgb, var(--v-dim) 45%, transparent)'} />
    </button>
  );
}

function QuickTile({ icon, label, value, tint, onClick }: { icon: string; label: string; value: string; tint: string; onClick: () => void }) {
  return (
    <Card padding={12} onClick={onClick} label={label}>
      <Icon n={icon} o size={20} color={tint} />
      <div className="h-2" />
      <div className="t-card truncate" style={{ color: 'var(--v-text)', fontSize: 15 }}>{value}</div>
      <div className="t-caption truncate" style={{ color: 'var(--v-dim)' }}>{label}</div>
    </Card>
  );
}
