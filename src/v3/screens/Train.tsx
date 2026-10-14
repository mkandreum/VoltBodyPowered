/** Entrenar (espejo de ui/v3/TrainV3.kt). */
import { useMemo, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, type Exercise, type WorkoutDay } from '../../store/useAppStore';
import { Haptics } from '../../lib/haptics';
import {
  ArtPalette, Card, CircleMedia, DarkButton, ExerciseImage, FitText, FlutedArt, GooeyCta, Icon, IconCircle, MixTitle,
  ON_ACCENT, Screen, SectionLabel, cx, enter, gymTerm,
} from '../kit';
import { MIN_PER_EXERCISE, WEEKDAY_FULL, WEEK_LETTERS, addDaysKey, logDateKey, mapRoutineByWeekday, mondayFirstIndex, mondayOf, setsLabel } from '../data';
import { useNav } from '../nav';

export default function Train() {
  const s = useAppStore(useShallow((st) => ({ routine: st.routine, logs: st.logs, custom: st.customWorkout })));
  const push = useNav((n) => n.push);
  const today = useMemo(() => new Date(), []);
  const todayIdx = mondayFirstIndex(today);
  const [sel, setSel] = useState(todayIdx);

  const ui = useMemo(() => {
    const week = mapRoutineByWeekday(s.routine);
    const monday = mondayOf(today);
    const byDate = new Map<string, Set<string>>();
    s.logs.forEach((l) => { const k = logDateKey(l.date); (byDate.get(k) ?? byDate.set(k, new Set()).get(k)!).add(l.exerciseId); });
    const done = Array.from({ length: 7 }, (_, i) => byDate.get(addDaysKey(monday, i)) ?? new Set<string>());
    return { week, done };
  }, [s.routine, s.logs, today]);

  const trainDays = ui.week.filter(Boolean).length;
  const doneDays = ui.week.filter((d, i) => d && ui.done[i].size > 0).length;
  const day = ui.week[sel];

  return (
    <Screen>
      <div className={cx('flex items-center w-full', enter(0).className)} style={enter(0).style}>
        <div className="flex-1 min-w-0">
          <p className="t-hello m-0" style={{ color: 'var(--v-dim)' }}>Esta semana · {doneDays} de {trainDays} días</p>
          <MixTitle text="Hoy, a entrenar" maxLines={1} />
        </div>
        <IconCircle icon="playlist_add" label="Rutina personal" onClick={() => push({ kind: 'section', id: 'library' })} />
      </div>

      {/* Selector de semana */}
      <div className="flex justify-between w-full md:justify-start md:gap-4 enter" style={enter(1).style}>
        {WEEK_LETTERS.map((l, i) => {
          const active = i === sel;
          const has = !!ui.week[i];
          const done = has && ui.done[i].size > 0;
          return (
            <div key={l} className="flex flex-col items-center">
              <button type="button" aria-label={WEEKDAY_FULL[i]} aria-pressed={active} onClick={() => { setSel(i); Haptics.selection(); }}
                className="tap w-[42px] h-[42px] rounded-full flex items-center justify-center transition-colors"
                style={{ background: active ? 'var(--v-accent)' : 'var(--v-surface)', ['--tap' as string]: 0.9 } as CSSProperties}>
                {done && !active ? <Icon n="check" size={18} color="var(--v-accent)" />
                  : <span className="t-card" style={{ color: active ? ON_ACCENT : has ? 'var(--v-text)' : 'var(--v-dim)' }}>{l}</span>}
              </button>
              <span className="mt-[5px] w-[5px] h-[5px] rounded-full" style={{
                background: i === todayIdx ? 'var(--v-accent)' : has ? 'color-mix(in srgb, var(--v-dim) 50%, transparent)' : 'transparent',
              }} />
            </div>
          );
        })}
      </div>

      <div key={sel} className="fade-in flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-6 md:items-start">
        {!day ? (
          <RestHero isToday={sel === todayIdx} onCustom={() => push({ kind: 'section', id: 'library' })} />
        ) : (
          <>
            <DayHero day={day} tag={sel === todayIdx ? 'Hoy' : WEEKDAY_FULL[sel]} done={ui.done[sel]}
              onStart={() => push({ kind: 'session', weekday: sel })} onOpen={() => push({ kind: 'day', weekday: sel })} />
            <div className="flex flex-col gap-3">
              <SectionLabel text="Programa" action="Ver todo" onAction={() => push({ kind: 'day', weekday: sel })} />
              {day.exercises.slice(0, 3).map((ex, k) => (
                <ExerciseRow key={`${ex.id}-${k}`} ex={ex} index={k} done={ui.done[sel].has(ex.id)} onClick={() => push({ kind: 'session', weekday: sel, start: k })} />
              ))}
              <div className="hidden md:grid grid-cols-2 gap-3">
                <MiniActions custom={s.custom} />
              </div>
            </div>
          </>
        )}
        <div className={cx('grid grid-cols-2 gap-3', day && 'md:hidden')}>
          <MiniActions custom={s.custom} />
        </div>
      </div>
    </Screen>
  );
}

function MiniActions({ custom }: { custom: Exercise[] }) {
  const push = useNav((n) => n.push);
  return (
    <>
      <MiniAction icon="fitness_center" title="Rutina personal" sub={`${custom.length} ejercicios`}
        onClick={() => (custom.length ? push({ kind: 'session', weekday: -1, start: 0, custom: true }) : push({ kind: 'section', id: 'library' }))} />
      <MiniAction icon="insights" title="Fatiga muscular" sub="Volumen semanal" onClick={() => push({ kind: 'section', id: 'fatigue' })} />
    </>
  );
}

function MiniAction({ icon, title, sub, onClick }: { icon: string; title: string; sub: string; onClick: () => void }) {
  return (
    <Card padding={14} onClick={onClick} label={title}>
      <Icon n={icon} o size={20} color="var(--v-accent)" />
      <div className="h-2" />
      <div className="t-card truncate" style={{ color: 'var(--v-text)' }}>{title}</div>
      <div className="t-caption truncate" style={{ color: 'var(--v-dim)' }}>{sub}</div>
    </Card>
  );
}

/** Tarjeta héroe del día: arte de vidrio estriado + título grande + GIF en círculo con burbuja. */
function DayHero({ day, tag, done, onStart, onOpen }: { day: WorkoutDay; tag: string; done: Set<string>; onStart: () => void; onOpen: () => void }) {
  const first = day.exercises[0];
  const doneCount = day.exercises.filter((e) => done.has(e.id)).length;
  return (
    <div className="flex flex-col gap-3">
      <div role="button" tabIndex={0} onClick={() => { Haptics.light(); onOpen(); }} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
        className="tap relative w-full h-[250px] md:h-[300px] rounded-[30px] overflow-hidden" style={{ ['--tap' as string]: 0.985 } as CSSProperties}>
        <FlutedArt className="absolute inset-0" colors={ArtPalette.forKey(day.focus)} seed={day.focus.length} />
        <div className="absolute top-0 left-0 p-[18px] w-[60%]">
          <span className="t-label inline-block rounded-[10px] px-2.5 py-[5px]" style={{ color: '#fff', background: 'rgba(0,0,0,0.4)' }}>{tag}</span>
          <div className="h-3.5" />
          <FitText text={gymTerm(day.focus || 'Workout')} className="t-headline" color="#fff" maxLines={3} minScale={0.6} />
        </div>
        <div className="absolute bottom-0 left-0 p-[18px] flex items-center">
          <Icon n="access_time" o size={16} color="#fff" />
          <span className="t-body ml-1.5 whitespace-nowrap" style={{ color: '#fff' }}>{day.exercises.length * MIN_PER_EXERCISE} min · {day.exercises.length} ejercicios</span>
        </div>
        <div className="absolute right-[18px] top-1/2 -translate-y-1/2">
          <CircleMedia size={120} bubble={doneCount > 0 ? `${doneCount}/${day.exercises.length}` : `${day.exercises.length}`} ring="transparent">
            <ExerciseImage url={first?.gifUrl} iconSize={40} />
          </CircleMedia>
        </div>
      </div>
      <GooeyCta text={doneCount > 0 ? 'Continuar entreno' : 'Empezar entreno'} onClick={onStart} />
    </div>
  );
}

function RestHero({ isToday, onCustom }: { isToday: boolean; onCustom: () => void }) {
  return (
    <Card padding={20} className="h-[220px]">
      <Icon n="hotel" o size={30} color="var(--v-accent)" />
      <div className="flex-1" />
      <div className="t-screen" style={{ color: 'var(--v-text)', fontSize: 22, lineHeight: '26px' }}>{isToday ? 'Hoy toca descansar' : 'Día de descanso'}</div>
      <p className="t-body m-0" style={{ color: 'var(--v-dim)' }}>El músculo crece cuando descansa. Si te apetece, haz una sesión libre.</p>
      <div className="h-3" />
      <DarkButton text="Sesión libre" icon="add" onClick={onCustom} />
    </Card>
  );
}

/** Fila de ejercicio: miniatura redondeada + nombre + series. */
export function ExerciseRow({ ex, index, done, onClick }: { ex: Exercise; index: number; done: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={() => { Haptics.light(); onClick(); }}
      className="tap w-full flex items-center rounded-[22px] p-2 text-left" style={{ background: 'var(--v-surface)', ['--tap' as string]: 0.98 } as CSSProperties}>
      <span className="w-16 h-16 rounded-[16px] overflow-hidden flex items-center justify-center shrink-0" style={{ background: 'var(--v-surface2)' }}>
        {ex.gifUrl ? <ExerciseImage url={ex.gifUrl} /> : <span className="t-section" style={{ color: 'var(--v-dim)' }}>{index + 1}</span>}
      </span>
      <span className="flex-1 min-w-0 ml-3">
        <FitText text={ex.name} className="t-card" color="var(--v-text)" maxLines={2} style={{ fontSize: 14 }} />
        <span className="t-caption block truncate" style={{ color: 'var(--v-dim)' }}>{setsLabel(ex)}{ex.muscleGroup ? ` · ${ex.muscleGroup}` : ''}</span>
      </span>
      {done ? (
        <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--v-accent)' }}><Icon n="check" size={16} color={ON_ACCENT} label="Hecho" /></span>
      ) : <Icon n="keyboard_arrow_right" color="var(--v-dim)" />}
      <span className="w-1" />
    </button>
  );
}
