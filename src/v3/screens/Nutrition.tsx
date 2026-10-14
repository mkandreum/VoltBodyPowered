/** Nutrición (espejo de ui/v3/NutritionV3.kt). */
import { useMemo, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, type Meal } from '../../store/useAppStore';
import { Haptics } from '../../lib/haptics';
import { generateAlternativeMeal } from '../../services/geminiService';
import { authService } from '../../services/authService';
import {
  BigDonut, Card, ConfettiBurst, DayStrip, FitText, GlassSheet, Icon, IconCircle, LimeButton, MixTitle, ON_ACCENT, Screen,
  SectionLabel, Spinner, cx, enter, fmt, startOfDay,
} from '../kit';
import { WATER_GOAL, dateKey, foodEmoji, mealMoment, mealsFor, replaceMeal } from '../data';
import { useNav } from '../nav';

const PROTEIN = '#FF6B8B', CARBS = '#FFB547', FAT = '#8B7CFF';
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function cheer(done: number, total: number, left: number) {
  if (total === 0) return 'Hoy toca comer bien';
  if (done === 0) return 'Empieza fuerte: tu primera comida te espera 💪';
  if (done === total) return 'Día perfecto. Así se construye un cuerpo 🏆';
  if (done * 2 >= total) return '¡Vas genial! Ya queda menos 🔥';
  if (left < 400) return 'Casi lo tienes, remata el día 🎯';
  return 'Buen arranque, sigue así ⚡';
}
function pastCheer(done: number, total: number, wd: string) {
  if (total === 0) return 'Sin menú ese día';
  if (done === total) return `El ${wd} lo clavaste 🏆`;
  if (done === 0) return `El ${wd} no marcaste comidas`;
  return `El ${wd} cumpliste ${done} de ${total}`;
}

export default function Nutrition() {
  const s = useAppStore(useShallow((st) => ({
    diet: st.diet, profile: st.profile, mealEatenRecord: st.mealEatenRecord, dailyMetrics: st.dailyMetrics, authToken: st.authToken,
    toggleMealEaten: st.toggleMealEaten, saveMetrics: st.saveMetrics, showToast: st.showToast, setDiet: st.setDiet,
  })));
  const push = useNav((n) => n.push);
  const todayDate = useMemo(() => startOfDay(new Date()), []);
  const today = dateKey(todayDate);
  const [selected, setSelected] = useState(todayDate);
  const selKey = dateKey(selected);
  const isToday = selKey === today;
  const isFuture = selected > todayDate;
  const weekday = WEEKDAYS[selected.getDay()];
  const dateText = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${selected.getDate()} de ${MONTHS[selected.getMonth()]}`;
  const diet = s.diet;
  const eaten = s.mealEatenRecord[selKey] ?? [];
  const water = s.dailyMetrics[today]?.waterMl ?? 0;
  const [confetti, setConfetti] = useState(0);

  const [swap, setSwap] = useState<{ meal: Meal; alt: Meal | null; loading: boolean; applying: boolean } | null>(null);
  const loadAlternative = async (meal: Meal) => {
    setSwap({ meal, alt: null, loading: true, applying: false });
    try {
      const alt = await generateAlternativeMeal(meal, s.profile, s.authToken);
      setSwap((w) => w && { ...w, alt: { ...alt, id: alt.id || meal.id, time: alt.time || meal.time }, loading: false });
    } catch (e) {
      setSwap(null);
      s.showToast({ type: 'error', title: 'No se pudo cambiar la comida', message: (e as Error)?.message || 'Prueba de nuevo en un momento.' });
    }
  };
  const applySwap = async () => {
    if (!swap?.alt || !diet || swap.applying) return;
    setSwap({ ...swap, applying: true });
    const updated = replaceMeal(diet, selected, swap.meal.id, swap.alt);
    try {
      s.setDiet(updated);
      if (s.authToken) await authService.updateProfile(s.authToken, { diet: updated });
      if (swap.alt.id !== swap.meal.id && eaten.includes(swap.meal.id)) { s.toggleMealEaten(swap.meal.id, selKey); s.toggleMealEaten(swap.alt.id, selKey); }
      Haptics.success();
      s.showToast({ type: 'success', title: `Comida cambiada ${foodEmoji(swap.alt)}`, message: swap.alt.name });
      setSwap(null);
    } catch (e) {
      s.setDiet(diet);
      s.showToast({ type: 'error', title: 'No se pudo cambiar la comida', message: (e as Error)?.message });
      setSwap((w) => w && { ...w, applying: false });
    }
  };

  const header = (
    <div className={cx('flex items-center w-full', enter(0).className)} style={enter(0).style}>
      <div className="flex-1 min-w-0">
        <p className="t-hello m-0 truncate" style={{ color: 'var(--v-dim)' }}>{dateText}</p>
        <MixTitle text="Come bien, rinde más" maxLines={1} />
      </div>
      <IconCircle icon="shopping_cart" o label="Lista de la compra" onClick={() => push({ kind: 'section', id: 'shopping' })} />
      <span className="w-2" />
      <IconCircle icon="tune" o label="Plan de comidas" onClick={() => push({ kind: 'section', id: 'diet' })} />
    </div>
  );
  const strip = <DayStrip today={todayDate} selected={selected} onSelect={(d) => { if (dateKey(d) !== selKey) { setSelected(d); Haptics.selection(); } }} className="enter" style={enter(1).style} />;

  if (!diet || (!diet.meals?.length && !diet.week?.length)) {
    return (
      <Screen>
        {header}{strip}
        <Card padding={22} className="enter" style={enter(1).style}>
          <span style={{ fontSize: 44 }}>🥗</span>
          <div className="h-2.5" />
          <div className="t-display" style={{ color: 'var(--v-text)' }}>Tu plan de comidas te espera</div>
          <p className="t-body m-0" style={{ color: 'var(--v-dim)' }}>Lo creamos con IA según tu objetivo y tus gustos.</p>
          <div className="h-4" />
          <LimeButton text="Crear mi plan" height={50} onClick={() => push({ kind: 'section', id: 'diet' })} />
        </Card>
      </Screen>
    );
  }

  const meals = [...mealsFor(diet, selected)].sort((a, b) => a.time.localeCompare(b.time));
  const done = meals.filter((m) => eaten.includes(m.id));
  const counted = isFuture ? meals : done;
  const kcal = counted.reduce((a, m) => a + m.calories, 0);
  const left = Math.max(0, diet.dailyCalories - kcal);
  const p = counted.reduce((a, m) => a + m.protein, 0), c = counted.reduce((a, m) => a + m.carbs, 0), f = counted.reduce((a, m) => a + m.fat, 0);
  const now = new Date().toTimeString().slice(0, 5);
  const nextId = !isToday ? null : (meals.find((m) => !eaten.includes(m.id) && m.time >= now) ?? meals.find((m) => !eaten.includes(m.id)))?.id ?? null;

  const toggle = (m: Meal) => {
    const nowEaten = !eaten.includes(m.id);
    if (nowEaten) {
      if (done.length + 1 === meals.length) { Haptics.success(); setConfetti((x) => x + 1); s.showToast({ type: 'success', title: '¡Día perfecto! 🎉', message: 'Has cumplido todas tus comidas.' }); }
      else Haptics.medium();
    } else Haptics.light();
    s.toggleMealEaten(m.id, selKey);
  };

  return (
    <div className="relative">
      <Screen>
        {header}{strip}
        <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-6 md:items-start">
          <div className="flex flex-col gap-3 md:sticky md:top-8">
            {/* Héroe: kcal + mensaje con actitud + macros */}
            <Card padding={18} className="enter" style={enter(1).style}>
              <div className="flex items-center">
                <BigDonut key={selKey} progress={isFuture ? 0 : diet.dailyCalories > 0 ? kcal / diet.dailyCalories : 0} size={118} stroke={12}>
                  <div className="flex flex-col items-center">
                    <span style={{ fontSize: 18, lineHeight: 1.2 }}>🔥</span>
                    <span className="t-value" style={{ color: 'var(--v-text)' }}>{fmt(kcal)}</span>
                    <span className="t-caption" style={{ color: 'var(--v-dim)' }}>kcal</span>
                  </div>
                </BigDonut>
                <div className="flex-1 min-w-0 ml-4">
                  <div className="t-display line-clamp-3" style={{ color: 'var(--v-text)', fontSize: 15, lineHeight: '20px' }}>
                    {isFuture ? `Así comerás el ${weekday} 👀` : !isToday ? pastCheer(done.length, meals.length, weekday) : cheer(done.length, meals.length, left)}
                  </div>
                  <div className="h-1" />
                  <div className="t-caption" style={{ color: 'var(--v-dim)' }}>
                    {isFuture ? `${fmt(kcal)} kcal planificadas en ${meals.length} comidas`
                      : left > 0 ? `${isToday ? 'Te quedan ' : 'Faltaron '}${fmt(left)} kcal de ${fmt(diet.dailyCalories)}`
                      : `Objetivo de ${fmt(diet.dailyCalories)} kcal cumplido`}
                  </div>
                </div>
              </div>
              <div className="h-4" />
              <div className="grid grid-cols-3 gap-2">
                <MacroChip emoji="🥩" label="Proteína" value={p} target={isFuture ? p : diet.macros.protein} color={PROTEIN} />
                <MacroChip emoji="🍚" label="Carbos" value={c} target={isFuture ? c : diet.macros.carbs} color={CARBS} />
                <MacroChip emoji="🥑" label="Grasas" value={f} target={isFuture ? f : diet.macros.fat} color={FAT} />
              </div>
            </Card>

            {/* Agua (un toque = +250 ml): solo hoy */}
            {isToday && (
              <button type="button" onClick={() => { Haptics.medium(); s.saveMetrics(today, { waterMl: water + 250 }); }}
                className="tap w-full flex items-center rounded-[22px] px-4 py-3 text-left enter"
                style={{ background: 'var(--v-surface)', ['--tap' as string]: 0.98, ...enter(2).style } as CSSProperties}>
                <span style={{ fontSize: 22 }}>💧</span>
                <span className="flex-1 min-w-0 ml-2.5">
                  <span className="t-card block" style={{ color: 'var(--v-text)' }}>Agua · {fmt(water)} / {fmt(WATER_GOAL)} ml</span>
                  <span className="flex gap-1 mt-1.5">
                    {Array.from({ length: WATER_GOAL / 250 }, (_, i) => (
                      <span key={i} className="flex-1 h-2 rounded-[4px] transition-colors" style={{ background: water >= (i + 1) * 250 ? 'var(--v-water)' : 'var(--v-surface2)' }} />
                    ))}
                  </span>
                </span>
                <span className="t-card ml-3" style={{ color: 'var(--v-water)' }}>+250</span>
              </button>
            )}

            {/* Plan antiguo (un solo menú): invita a regenerarlo */}
            {!diet.week?.length && (
              <button type="button" onClick={() => push({ kind: 'section', id: 'diet' })}
                className="tap w-full flex items-center rounded-[22px] px-4 py-3 text-left enter" style={{ background: 'var(--v-surface)', ...enter(3).style }}>
                <span style={{ fontSize: 22 }}>🗓️</span>
                <span className="flex-1 min-w-0 ml-2.5">
                  <span className="t-card block" style={{ color: 'var(--v-text)' }}>Menú igual todos los días</span>
                  <span className="t-caption block" style={{ color: 'var(--v-dim)' }}>Regenera tu plan para tener un menú distinto cada día de la semana.</span>
                </span>
                <Icon n="keyboard_arrow_right" size={20} color="var(--v-dim)" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <SectionLabel {...enter(3)} text={isToday ? `Tu día · ${done.length}/${meals.length} comidas`
              : isFuture ? `Menú del ${dateText.charAt(0).toLowerCase()}${dateText.slice(1)}` : `${dateText} · ${done.length}/${meals.length}`} />
            <div key={selKey}>
              {meals.map((m, i) => (
                <MealRow key={m.id} m={m} eaten={eaten.includes(m.id)} next={m.id === nextId} last={i === meals.length - 1} index={4 + i}
                  canToggle={!isFuture} onToggle={() => toggle(m)} onSwap={() => loadAlternative(m)} />
              ))}
            </div>
          </div>
        </div>
      </Screen>
      <ConfettiBurst burst={confetti} />

      {swap && (
        <GlassSheet onDismiss={() => { if (!swap.applying) setSwap(null); }} label="Cambio con IA">
          <div className="px-5 pb-[calc(28px+env(safe-area-inset-bottom))] flex flex-col gap-3.5 overflow-y-auto">
            <div className="t-label" style={{ color: 'var(--v-accent)' }}>Cambio con IA</div>
            <div className="t-section" style={{ color: 'var(--v-text)', fontSize: 22, lineHeight: '27px' }}>Una alternativa para {swap.meal.name}</div>
            <div className="rounded-[24px] p-4 flex flex-col gap-1" style={{ background: 'var(--v-surface2)' }}>
              <div className="t-label" style={{ color: 'var(--v-dim)' }}>Actual</div>
              <div className="line-clamp-2" style={{ color: 'var(--v-dim)', font: '700 17px/22px var(--font-sans)' }}>{foodEmoji(swap.meal)} {swap.meal.name}</div>
              <MacroLine m={swap.meal} />
            </div>
            {swap.loading || !swap.alt ? (
              <div className="flex flex-col gap-2.5 fade-in">
                <div className="flex items-center gap-2"><Spinner color="var(--v-accent)" size={16} /><span className="t-body" style={{ color: 'var(--v-dim)' }}>Buscando algo equivalente...</span></div>
                <div className="skeleton h-[22px] w-[60%] rounded-[11px]" />
                <div className="skeleton h-3.5 w-full rounded-[7px]" />
                <div className="skeleton h-3.5 w-[85%] rounded-[7px]" />
                <div className="skeleton h-[18px] w-1/2 rounded-[9px]" />
              </div>
            ) : (
              <div className="rounded-[24px] p-4 flex flex-col gap-1.5 fade-in"
                style={{ background: 'color-mix(in srgb, var(--v-accent) 10%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--v-accent) 35%, transparent)' }}>
                <div className="t-label" style={{ color: 'var(--v-accent)' }}>Nueva propuesta</div>
                <div style={{ color: 'var(--v-text)', font: '700 17px/22px var(--font-sans)' }}>{foodEmoji(swap.alt)} {swap.alt.name}</div>
                {swap.alt.description && <p className="t-body m-0 line-clamp-5" style={{ color: 'var(--v-dim)' }}>{swap.alt.description}</p>}
                <MacroLine m={swap.alt} />
                <p className="t-body m-0" style={{ color: 'var(--v-dim)' }}>
                  {swap.alt.calories === swap.meal.calories ? 'Mismas calorías'
                    : swap.alt.calories > swap.meal.calories ? `+${swap.alt.calories - swap.meal.calories} kcal respecto a la actual` : `${swap.alt.calories - swap.meal.calories} kcal respecto a la actual`}
                </p>
              </div>
            )}
            <LimeButton text="Usar esta comida" enabled={!swap.loading && !!swap.alt} loading={swap.applying} onClick={applySwap} />
            <button type="button" disabled={swap.loading || swap.applying} onClick={() => loadAlternative(swap.meal)}
              className="tap w-full py-3.5 rounded-full" style={{ color: 'var(--v-accent)', font: '700 17px/22px var(--font-sans)', opacity: swap.loading || swap.applying ? 0.4 : 1 }}>
              Probar otra opción
            </button>
          </div>
        </GlassSheet>
      )}
    </div>
  );
}

function MacroLine({ m }: { m: Meal }) {
  return <div className="t-caption" style={{ color: 'var(--v-dim)' }}>{m.calories} kcal · P{m.protein} C{m.carbs} G{m.fat}</div>;
}

function MacroChip({ emoji, label, value, target, color }: { emoji: string; label: string; value: number; target: number; color: string }) {
  const frac = target > 0 ? Math.min(1, Math.max(0, value / target)) : 0;
  return (
    <div className="rounded-[18px] px-2.5 py-2.5 min-w-0" style={{ background: 'var(--v-surface2)' }}>
      <div className="flex items-center">
        <span style={{ fontSize: 15 }}>{emoji}</span>
        <span className="t-caption truncate ml-[5px]" style={{ color: 'var(--v-dim)' }}>{label}</span>
      </div>
      <div className="flex items-end mt-1">
        <span className="t-value" style={{ color: 'var(--v-text)', fontSize: 16, lineHeight: '20px' }}>{value}</span>
        <span className="t-caption truncate" style={{ color: 'var(--v-dim)' }}> /{target}g</span>
      </div>
      <div className="mt-1.5 h-[5px] rounded-[3px] overflow-hidden" style={{ background: 'var(--v-bg)' }}>
        <div className="h-full rounded-[3px] transition-[width] duration-700" style={{ width: `${Math.max(0.1, frac * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

/** Fila de línea de tiempo: hora + punto, emoji grande, nombre, macros, check y cambio IA. */
function MealRow({ m, eaten, next, last, index, canToggle, onToggle, onSwap }: {
  m: Meal; eaten: boolean; next: boolean; last: boolean; index: number; canToggle: boolean; onToggle: () => void; onSwap: () => void;
}) {
  return (
    <div className="flex w-full items-stretch enter" style={enter(index).style}>
      <div className="w-11 flex flex-col items-center shrink-0">
        <span className="t-caption" style={{ color: next ? 'var(--v-accent)' : 'var(--v-dim)' }}>{m.time}</span>
        <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: eaten || next ? 'var(--v-accent)' : 'var(--v-surface2)' }} />
        {!last && <span className="w-0.5 flex-1" style={{ background: 'var(--v-surface2)' }} />}
      </div>
      <div className="flex-1 min-w-0 ml-1.5 pb-2.5">
        <div className="flex items-center rounded-[22px] p-2.5" style={{ background: 'var(--v-surface)', boxShadow: next ? 'inset 0 0 0 1.5px var(--v-accent)' : undefined }}>
          <span className="w-[54px] h-[54px] rounded-[16px] flex items-center justify-center shrink-0" style={{ background: 'var(--v-surface2)' }}>
            <span key={String(eaten)} className={eaten ? 'pop' : undefined} style={{ fontSize: 28, opacity: eaten ? 0.45 : 1 }}>{foodEmoji(m)}</span>
          </span>
          <div className="flex-1 min-w-0 ml-3">
            <div className="flex items-center">
              <span className="t-label truncate" style={{ color: next ? 'var(--v-accent)' : 'var(--v-dim)' }}>{mealMoment(m.time)}</span>
              {next && <span className="t-label ml-1.5 rounded-[6px] px-[5px] py-px" style={{ color: ON_ACCENT, background: 'var(--v-accent)' }}>Ahora</span>}
            </div>
            <FitText text={m.name} className="t-card" color={eaten ? 'var(--v-dim)' : 'var(--v-text)'} maxLines={2} style={{ fontSize: 14 }} />
            <div className="t-caption truncate" style={{ color: 'var(--v-dim)' }}>{m.calories} kcal · P{m.protein} C{m.carbs} G{m.fat}</div>
          </div>
          <div className="flex flex-col items-center ml-1.5">
            {canToggle && (
              <button type="button" role="checkbox" aria-checked={eaten} aria-label={eaten ? 'Comida hecha' : 'Marcar como hecha'} onClick={onToggle}
                className="tap w-12 h-12 rounded-full flex items-center justify-center" style={{ ['--tap' as string]: 0.85 } as CSSProperties}>
                <span key={String(eaten)} className={cx('w-9 h-9 rounded-full flex items-center justify-center transition-colors', eaten && 'pop')}
                  style={{ background: eaten ? 'var(--v-accent)' : 'transparent', boxShadow: `inset 0 0 0 1.5px ${eaten ? 'var(--v-accent)' : 'color-mix(in srgb, var(--v-dim) 50%, transparent)'}` }}>
                  {eaten && <Icon n="check" size={20} color={ON_ACCENT} />}
                </span>
              </button>
            )}
            <button type="button" aria-label="Cambiar con IA" onClick={() => { Haptics.light(); onSwap(); }}
              className="tap w-12 h-12 rounded-full flex items-center justify-center" style={{ ['--tap' as string]: 0.8 } as CSSProperties}>
              <Icon n="auto_awesome" o size={20} color="var(--v-accent)" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
