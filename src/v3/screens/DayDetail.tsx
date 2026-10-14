/** Detalle de día (espejo de DayDetailV3 en ui/v3/TrainV3.kt). */
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { ArtPalette, CircleMedia, ExerciseImage, FitText, FlutedArt, GooeyCta, Icon, IconCircle, enter, gymTerm } from '../kit';
import { MIN_PER_EXERCISE, addDaysKey, logDateKey, mapRoutineByWeekday, mondayOf } from '../data';
import { useNav } from '../nav';
import { ExerciseRow } from './Train';

export default function DayDetail({ weekday }: { weekday: number }) {
  const s = useAppStore(useShallow((st) => ({ routine: st.routine, logs: st.logs })));
  const { push, pop } = useNav(useShallow((n) => ({ push: n.push, pop: n.pop })));
  const day = useMemo(() => mapRoutineByWeekday(s.routine)[weekday], [s.routine, weekday]);
  const done = useMemo(() => {
    const k = addDaysKey(mondayOf(new Date()), weekday);
    return new Set(s.logs.filter((l) => logDateKey(l.date) === k).map((l) => l.exerciseId));
  }, [s.logs, weekday]);
  useEffect(() => { if (!day) pop(); }, [day, pop]);
  if (!day) return null;

  const groups = [...new Set(day.exercises.map((e) => e.muscleGroup).filter(Boolean))].slice(0, 3).join(', ');
  const totalSets = day.exercises.reduce((a, e) => a + (e.sets || 0), 0);
  const min = day.exercises.length * MIN_PER_EXERCISE;

  return (
    <div className="relative min-h-[100dvh] md:max-w-[1100px] md:mx-auto md:px-8 md:pt-8 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-8 md:items-start">
      {/* Héroe */}
      <div className="relative w-full h-[330px] rounded-b-[36px] overflow-hidden md:rounded-[36px] md:h-[440px] md:sticky md:top-8">
        <FlutedArt className="absolute inset-0" colors={ArtPalette.forKey(day.focus)} seed={day.focus.length} />
        <div className="absolute inset-0 flex items-center justify-center pt-[30px]">
          <CircleMedia size={196} bubble={`${min}'`} ring="transparent">
            <ExerciseImage url={day.exercises[0]?.gifUrl} iconSize={64} eager />
          </CircleMedia>
        </div>
        <div className="absolute left-4 top-[calc(16px+env(safe-area-inset-top))]">
          <IconCircle icon="arrow_back" label="Atrás" bg="rgba(0,0,0,0.6)" tint="#fff" onClick={pop} />
        </div>
      </div>

      <div className="pb-[120px] md:pb-10">
        <div className="px-5 md:px-0 enter" style={enter(0).style}>
          <FitText as="h1" text={gymTerm(day.focus || 'Workout')} className="t-headline" color="var(--v-text)" maxLines={2} minScale={0.65} />
          <div className="h-1.5" />
          <div className="flex items-center">
            <Icon n="access_time" o size={16} color="var(--v-dim)" />
            <span className="t-body ml-1.5" style={{ color: 'var(--v-dim)' }}>{min} minutos</span>
          </div>
          <div className="h-2.5" />
          <p className="t-body m-0" style={{ color: 'var(--v-dim)' }}>
            Sesión de {day.exercises.length} ejercicios y {totalSets} series{groups ? ` centrada en ${groups}.` : '.'} Controla la bajada y descansa entre series.
          </p>
          <div className="h-[18px]" />
          <h2 className="t-section m-0" style={{ color: 'var(--v-text)' }}>Programa</h2>
          <div className="h-2.5" />
        </div>
        <div className="flex flex-col gap-2.5 px-5 md:px-0">
          {day.exercises.map((ex, i) => (
            <div key={`${ex.id}-${i}`} className="enter" style={enter(i + 1).style}>
              <ExerciseRow ex={ex} index={i} done={done.has(ex.id)} onClick={() => push({ kind: 'session', weekday, start: i })} />
            </div>
          ))}
        </div>
        <div className="hidden md:block mt-6">
          <GooeyCta text={done.size ? 'Continuar' : 'Empezar'} onClick={() => push({ kind: 'session', weekday, start: 0 })} />
        </div>
      </div>

      {/* CTA fija (móvil) sobre degradado de fondo */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-20 px-5 pt-6 pb-[calc(14px+env(safe-area-inset-bottom))]"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--v-bg) 45%, var(--v-bg))' }}>
        <GooeyCta text={done.size ? 'Continuar' : 'Empezar'} onClick={() => push({ kind: 'session', weekday, start: 0 })} />
      </div>
    </div>
  );
}
