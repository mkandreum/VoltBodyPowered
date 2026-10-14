/** Actividad (espejo de ui/v3/ActivityV3.kt). */
import { useMemo, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { Haptics } from '../../lib/haptics';
import {
  BigDonut, Card, DayStrip, CardHeader, GlassSheet, Icon, IconCircle, MiniBars, MixTitle, ON_ACCENT, Screen, SmallPill,
  ValueUnit, WaveLine, addDays, cx, enter, fmt, fmt1, gymTerm, sameDay, startOfDay, trim,
} from '../kit';
import { WEEK_LETTERS, dateKey, logDateKey, mapRoutineByWeekday, mondayFirstIndex, mondayOf, summarize } from '../data';
import { goTab, useNav } from '../nav';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function Activity() {
  const st = useAppStore(useShallow((s) => ({
    routine: s.routine, logs: s.logs, diet: s.diet, mealEatenRecord: s.mealEatenRecord, dailyMetrics: s.dailyMetrics, weightLogs: s.weightLogs,
  })));
  const push = useNav((n) => n.push);
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selected, setSelected] = useState(today);
  const [weekly, setWeekly] = useState(false);
  const [showMonth, setShowMonth] = useState(false);

  const days = useMemo(() => (weekly ? Array.from({ length: 7 }, (_, i) => addDays(mondayOf(selected), i)) : [selected]), [selected, weekly]);
  const sum = useMemo(() => summarize(st, days), [st, days]);
  const series = (pick: 'steps' | 'waterMl') => Array.from({ length: 7 }, (_, i) => st.dailyMetrics[dateKey(addDays(selected, i - 6))]?.[pick] ?? 0);
  const stepSeries = useMemo(() => series('steps'), [st.dailyMetrics, selected]); // eslint-disable-line react-hooks/exhaustive-deps
  const waterSeries = useMemo(() => series('waterMl'), [st.dailyMetrics, selected]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthSteps = useMemo(() => {
    const from = dateKey(addDays(today, -29));
    return Object.values(st.dailyMetrics).filter((m) => m.date >= from && m.steps != null).map((m) => m.steps as number);
  }, [st.dailyMetrics, today]);

  const pick = (d: Date) => { setSelected(d); Haptics.selection(); };
  const trainText = sum.sets > 0 ? `${sum.sets} series · ${sum.doneExercises}/${sum.plannedExercises} ejercicios`
    : sum.plannedExercises > 0 ? `${gymTerm(sum.focus ?? 'Planificado')} · pendiente` : 'Descanso';

  return (
    <Screen>
      <div className={cx('flex items-center w-full', enter(0).className)} style={enter(0).style}>
        <div className="flex-1 min-w-0"><MixTitle text="Tu día, en datos" maxLines={1} /></div>
        <IconCircle icon="calendar_month" o label="Calendario" onClick={() => setShowMonth(true)} />
      </div>

      <DayStrip today={today} selected={selected} onSelect={pick} className="enter" style={enter(1).style} />

      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-4 md:items-start">
        <div className="flex flex-col gap-3">
          <div className="flex items-center w-full pt-1.5 enter" style={enter(2).style}>
            <Icon n="local_fire_department" size={18} color="var(--v-orange)" />
            <span className="t-card flex-1 ml-1.5" style={{ color: 'var(--v-text)' }}>Calorías</span>
            <SmallPill text={weekly ? 'Semanal' : 'Diario'} icon="keyboard_arrow_down" onClick={() => setWeekly((w) => !w)} />
          </div>
          <div className="enter" style={enter(2).style}>
            <ValueUnit value={fmt(sum.kcal)} unit="kcal" valueClass="t-heroxl" className="[&_.t-heroxl]:!text-[48px] [&_.t-heroxl]:!leading-[56px]" />
          </div>
          <div className="flex justify-center w-full enter" style={enter(3).style}>
            <BigDonut key={`${dateKey(selected)}-${weekly}`} progress={sum.goalPct / 100} size={214}>
              <div className="flex flex-col items-center">
                <span className="t-hero" style={{ color: 'var(--v-text)' }}>{sum.goalPct}%</span>
                <span className="t-caption" style={{ color: 'var(--v-dim)' }}>Objetivos</span>
              </div>
            </BigDonut>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:gap-4">
          <div className="grid grid-cols-2 gap-3 enter" style={enter(4).style}>
            <Card onClick={() => push({ kind: 'section', id: 'health' })} label="Pasos">
              <CardHeader icon="directions_walk" tint="var(--v-accent)" title="Pasos" />
              <div className="h-2.5" />
              <div className="flex items-end">
                <ValueUnit className="flex-1" value={fmt(sum.steps)} unit={`km ${fmt1(sum.km)}`} unitBelow />
                <MiniBars values={stepSeries} />
              </div>
            </Card>
            <Card onClick={() => goTab('home')} label="Agua">
              <CardHeader icon="water_drop" tint="var(--v-water)" title="Agua" />
              <div className="h-2.5" />
              <div className="flex items-end">
                <ValueUnit className="flex-1" value={fmt(sum.waterMl)} unit="ml" unitBelow />
                <WaveLine values={waterSeries} width={56} height={34} />
              </div>
            </Card>
          </div>

          {/* Resumen del día/semana: cada fila abre su pantalla */}
          <Card padding={8} className="enter" style={enter(5).style}>
            <SummaryRow icon="fitness_center" tint="var(--v-accent)" title="Entreno" value={trainText}
              onClick={() => (!weekly && sum.plannedExercises > 0 ? push({ kind: 'day', weekday: mondayFirstIndex(selected) }) : goTab('train'))} />
            <SummaryRow icon="restaurant" tint="var(--v-orange)" title="Comidas" value={`${sum.mealsEaten} de ${sum.meals} hechas`} onClick={() => goTab('food')} />
            <SummaryRow icon="monitor_weight" tint="var(--v-water)" title="Peso" value={sum.weight != null ? `${trim(sum.weight)} kg` : 'Sin registro'}
              onClick={() => push({ kind: 'section', id: 'weight' })} />
          </Card>

          <Card onClick={() => push({ kind: 'section', id: 'trends' })} label="Tendencias del mes" className="enter" style={enter(6).style}>
            <CardHeader icon="show_chart" o tint="var(--v-accent)" title="Tendencias del mes" />
            <div className="h-1.5" />
            <p className="t-caption m-0 line-clamp-2" style={{ color: 'var(--v-dim)' }}>
              {monthSteps.length === 0 ? 'Conecta tu salud para ver tu evolución de 30 días.'
                : `${fmt(Math.round(monthSteps.reduce((a, b) => a + b, 0) / monthSteps.length))} pasos de media · sueño, HRV, pulso y peso`}
            </p>
          </Card>
        </div>
      </div>

      {showMonth && (
        <GlassSheet onDismiss={() => setShowMonth(false)} label="Calendario">
          <div className="px-5 pb-[calc(28px+env(safe-area-inset-bottom))]">
            <div className="t-label" style={{ color: 'var(--v-accent)' }}>Calendario</div>
            <div className="t-section" style={{ color: 'var(--v-text)' }}>{MONTHS[selected.getMonth()]} {selected.getFullYear()}</div>
            <div className="h-3" />
            <MonthGrid month={selected} selected={selected} routine={st.routine} logs={st.logs}
              onSelect={(d) => { setSelected(d); setWeekly(false); setShowMonth(false); Haptics.selection(); }} />
          </div>
        </GlassSheet>
      )}
    </Screen>
  );
}


function SummaryRow({ icon, tint, title, value, onClick }: { icon: string; tint: string; title: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={() => { Haptics.light(); onClick(); }} className="tap w-full flex items-center rounded-[16px] px-2 py-2.5 text-left"
      style={{ ['--tap' as string]: 0.98 } as CSSProperties}>
      <Icon n={icon} o size={18} color={tint} />
      <span className="t-card w-[76px] ml-2.5 shrink-0" style={{ color: 'var(--v-text)' }}>{title}</span>
      <span className="t-caption flex-1 truncate" style={{ color: 'var(--v-dim)' }}>{value}</span>
    </button>
  );
}

/** Calendario mensual (CalendarParts.kt MonthGrid). */
export function MonthGrid({ month, selected, routine, logs, onSelect }: {
  month: Date; selected: Date; routine: Parameters<typeof mapRoutineByWeekday>[0]; logs: Array<{ date: string }>; onSelect: (d: Date) => void;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = mondayFirstIndex(first);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const rows = Math.ceil((offset + days) / 7);
  const today = startOfDay(new Date());
  const routineIdx = new Set(mapRoutineByWeekday(routine).map((d, i) => (d ? i : -1)).filter((i) => i >= 0));
  const logDays = new Set(logs.map((l) => logDateKey(l.date)));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_LETTERS.map((l) => <span key={l} className="t-label text-center" style={{ color: 'var(--v-dim)' }}>{l}</span>)}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, c) => {
            const n = r * 7 + c - offset + 1;
            if (n < 1 || n > days) return <span key={c} className="aspect-square" />;
            const d = new Date(month.getFullYear(), month.getMonth(), n);
            const isToday = sameDay(d, today);
            const sel = sameDay(d, selected);
            const dot = logDays.has(dateKey(d)) ? (isToday ? ON_ACCENT : '#34D399')
              : routineIdx.has(mondayFirstIndex(d)) ? (isToday ? 'rgba(10,10,10,0.5)' : 'color-mix(in srgb, var(--v-accent) 70%, transparent)') : 'transparent';
            return (
              <button key={c} type="button" onClick={() => onSelect(d)} aria-label={`${n}`}
                className="tap relative aspect-square rounded-[16px] flex items-center justify-center"
                style={{ background: isToday ? 'var(--v-accent)' : 'var(--v-surface2)', boxShadow: sel && !isToday ? 'inset 0 0 0 1.5px rgba(245,245,242,0.6)' : undefined }}>
                <span style={{ color: isToday ? ON_ACCENT : 'var(--v-text)', font: '800 14px/20px var(--font-sans)' }}>{n}</span>
                <span className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full" style={{ background: dot }} />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
