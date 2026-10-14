/** Onboarding estilo "stories": una pregunta por pantalla + generación del plan con IA (espejo de screens/OnboardingScreen.kt). */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useAppStore, type UserProfile } from '../../store/useAppStore';
import { authService } from '../../services/authService';
import { generatePlan } from '../../services/geminiService';
import { enrichRoutine } from '../../services/exerciseImageService';
import { Haptics } from '../../lib/haptics';
import { GlassSheet, Icon, LimeButton, ON_ACCENT, cx } from '../kit';

type Pg = 'name' | 'age' | 'gender' | 'weight' | 'height' | 'experience' | 'goal' | 'direction' | 'target' | 'months' | 'days' | 'minutes' | 'work' | 'meals' | 'foods' | 'special' | 'dish';
const PAGES: Array<{ pg: Pg; kicker: string; title: string; sub: string }> = [
  { pg: 'name', kicker: 'Tus datos', title: '¿Cómo te llamas?', sub: 'Para hablarte por tu nombre.' },
  { pg: 'age', kicker: 'Tus datos', title: '¿Qué edad tienes?', sub: 'Desliza para elegir.' },
  { pg: 'gender', kicker: 'Tus datos', title: 'Tu género biológico', sub: 'Ajusta calorías y cargas.' },
  { pg: 'weight', kicker: 'Tu cuerpo', title: '¿Cuánto pesas?', sub: 'Tu punto de partida.' },
  { pg: 'height', kicker: 'Tu cuerpo', title: '¿Cuánto mides?', sub: 'En centímetros.' },
  { pg: 'experience', kicker: 'Tu cuerpo', title: '¿Cuánta experiencia tienes?', sub: 'Sé sincero, adaptamos el plan.' },
  { pg: 'goal', kicker: 'Tu objetivo', title: '¿Qué quieres conseguir?', sub: 'Tu meta principal.' },
  { pg: 'direction', kicker: 'Tu objetivo', title: '¿Subir o bajar de peso?', sub: 'Define la dirección.' },
  { pg: 'target', kicker: 'Tu objetivo', title: '¿Cuántos kilos?', sub: 'Cantidad a modificar.' },
  { pg: 'months', kicker: 'Tu objetivo', title: '¿En cuánto tiempo?', sub: 'Plazo estimado en meses.' },
  { pg: 'days', kicker: 'Entrenamiento', title: '¿Cuántos días entrenas?', sub: 'A la semana.' },
  { pg: 'minutes', kicker: 'Entrenamiento', title: '¿Cuánto dura cada sesión?', sub: 'Sesiones compactas y efectivas.' },
  { pg: 'work', kicker: 'Horarios', title: '¿Cuál es tu jornada?', sub: 'Trabajo o estudio.' },
  { pg: 'meals', kicker: 'Horarios', title: '¿A qué hora comes?', sub: 'Toca una comida para cambiar la hora.' },
  { pg: 'foods', kicker: 'Nutrición', title: '¿Qué te gusta comer?', sub: 'Separa con comas.' },
  { pg: 'special', kicker: 'Nutrición', title: '¿Una clase especial?', sub: 'Pádel, fútbol, zumba, natación…' },
  { pg: 'dish', kicker: 'Nutrición', title: '¿Un plato especial?', sub: 'Opcional. Lo incluimos en tu dieta.' },
];
const EXPERIENCES = [
  { title: 'Principiante', desc: 'Nunca he entrenado o tengo poca experiencia', emoji: '🌱' },
  { title: 'Intermedio', desc: 'Entreno a veces y conozco los ejercicios básicos', emoji: '⚡' },
  { title: 'Avanzado', desc: 'Entreno regularmente con técnica depurada', emoji: '🔥' },
];
const GOALS = [
  { title: 'Ganar masa muscular', sub: 'Hipertrofia y volumen', icon: 'fitness_center' },
  { title: 'Perder grasa', sub: 'Definición y corte', icon: 'local_fire_department' },
  { title: 'Mantenimiento y salud', sub: 'Vitalidad y longevidad', icon: 'monitor_heart' },
  { title: 'Fuerza bruta', sub: 'Potencia y cargas máximas', icon: 'bolt' },
];
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MEALS: Array<[keyof UserProfile['mealTimes'], string, string]> = [
  ['breakfast', 'Desayuno', 'coffee'], ['brunch', 'Media mañana', 'fastfood'], ['lunch', 'Comida', 'wb_sunny'], ['snack', 'Merienda', 'restaurant'], ['dinner', 'Cena', 'nights_stay'],
];
const PLAN_STEPS = ['Analizando tu perfil', 'Calculando tus macronutrientes', 'Diseñando tu rutina semanal', 'Estructurando la progresión', 'Buscando ejercicios y animaciones', 'Puliendo los últimos detalles'];
const PLAN_PHRASES = [
  'Nuestra IA está calculando tus macros y estructurando tu progresión.', 'Puede tardar hasta un minuto. No cierres la app.',
  'Adaptando series, repeticiones y cargas a tu nivel.', 'Ajustando las comidas a tus horarios y gustos.',
];

const parseNum = (s: string) => { const v = parseFloat(String(s).trim().replace(',', '.')); return Number.isFinite(v) ? v : null; };
const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export default function Onboarding() {
  const st = useAppStore();
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(0);
  const [timeFor, setTimeFor] = useState<number | null>(null);
  const [f, setF] = useState({
    name: st.profile?.name || st.user?.name || '', age: '25', gender: 'Masculino', weight: '70', height: '175',
    experience: `${EXPERIENCES[0].title} (${EXPERIENCES[0].desc})`, goal: `${GOALS[0].title} (${GOALS[0].sub})`,
    direction: 'Ganar' as 'Ganar' | 'Perder', target: '5', months: '3', days: 3, minutes: 45, workHours: '09:00 - 17:00',
    meals: { breakfast: '08:00', brunch: '11:30', lunch: '14:00', snack: '18:00', dinner: '21:00' },
    vegs: 'brócoli, espinaca, zanahoria', carbs: 'arroz, papa, avena', prots: 'pollo, huevo, atún',
    specialOn: false, specialActivity: 'Zumba', specialDay: 'Sábado', specialMin: 60,
    dish: 'arroz, lentejas, tomate, queso feta', dishKcal: '390',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => { const n = { ...e }; delete n[k as string]; return n; }); };

  const validate = (pg: Pg) => {
    const e: Record<string, string> = {};
    const n = f.name.trim();
    if (pg === 'name') { if (!n) e.name = 'Introduce tu nombre para continuar'; else if (n.length > 80) e.name = 'El nombre no puede superar 80 caracteres'; }
    if (pg === 'age') { const a = parseInt(f.age, 10); if (!(a >= 12 && a <= 100)) e.age = 'La edad debe estar entre 12 y 100'; }
    if (pg === 'weight') { const w = parseNum(f.weight); if (w == null || w < 30 || w > 350) e.weight = 'Entre 30 y 350 kg'; }
    if (pg === 'height') { const h = parseNum(f.height); if (h == null || h < 120 || h > 250) e.height = 'Entre 120 y 250 cm'; }
    if (pg === 'target') { const t = parseNum(f.target); if (t == null || t < 1 || t > 50) e.target = 'Entre 1 y 50 kg'; }
    if (pg === 'months') { const m = parseInt(f.months, 10); if (!(m >= 1 && m <= 24)) e.months = 'Entre 1 y 24 meses'; }
    if (pg === 'work' && f.workHours.length > 120) e.workHours = 'Máximo 120 caracteres';
    if (pg === 'dish') { const k = f.dishKcal.trim(); if (k && !(parseInt(k, 10) >= 50 && parseInt(k, 10) <= 3000)) e.dishKcal = 'Entre 50 y 3000 kcal'; }
    setErrors(e);
    if (Object.keys(e).length) { setShake((x) => x + 1); Haptics.error(); }
    return !Object.keys(e).length;
  };

  const generate = async () => {
    if (loading) return;
    const goal = f.goal;
    const dish = f.dish.trim();
    const profile = {
      name: f.name.trim(), age: parseInt(f.age, 10) || 25, weight: parseNum(f.weight) ?? 70, height: parseNum(f.height) ?? 175,
      gender: f.gender, goal, currentState: f.experience, schedule: `${f.days} días a la semana, ${f.minutes} min`, workHours: f.workHours.trim(),
      trainingDaysPerWeek: f.days, sessionMinutes: f.minutes, goalDirection: f.direction, goalTargetKg: parseNum(f.target) ?? 5,
      goalTimelineMonths: parseInt(f.months, 10) || 3, mealTimes: f.meals,
      foodPreferences: { vegetables: splitList(f.vegs), carbs: splitList(f.carbs), proteins: splitList(f.prots) },
      weeklySpecialSession: { enabled: f.specialOn, activity: f.specialActivity.trim(), day: f.specialDay, durationMinutes: f.specialMin },
      specialDish: dish ? { ingredients: dish, targetCalories: parseInt(f.dishKcal, 10) || 0 } : undefined,
      avatarConfig: { muscleMass: /masa/i.test(goal) ? 0.6 : 0.4, bodyFat: /perder/i.test(goal) ? 0.3 : 0.5 },
    };
    setLoading(true);
    try {
      const plan = await generatePlan(profile, st.authToken);
      if (!plan.routine?.length) throw new Error('El plan generado no contiene entrenamientos');
      const routine = await enrichRoutine(plan.routine, st.authToken);
      if ((plan as { fallback?: boolean }).fallback) {
        st.showToast({ type: 'info', title: 'Plan de respaldo', message: (plan as { details?: string }).details || 'La IA está saturada; se ha generado un plan base. Podrás regenerarlo más tarde.' });
      }
      if (st.authToken) {
        await authService.updateProfile(st.authToken, { ...profile, routine, diet: plan.diet, insights: plan.insights });
      }
      st.setProfile(profile as UserProfile);
      st.setRoutine(routine);
      st.setDiet(plan.diet);
      if (plan.insights) st.setInsights(plan.insights);
      st.completeOnboarding();
      Haptics.success();
    } catch (e) {
      st.showToast({ type: 'error', title: 'No se pudo generar tu plan', message: (e as Error)?.message || 'Inténtalo de nuevo en unos segundos.' });
      setLoading(false);
    }
  };

  const next = () => {
    if (loading || !validate(PAGES[page].pg)) return;
    if (page < PAGES.length - 1) { Haptics.selection(); setDir(1); setPage(page + 1); } else generate();
  };
  const back = () => { if (page > 0 && !loading) { setErrors({}); setDir(-1); setPage(page - 1); } };

  if (loading) return <GeneratingPlan />;
  const info = PAGES[page];

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(16px+env(safe-area-inset-bottom))] md:max-w-[640px] md:mx-auto md:pt-10"
      style={{ background: 'var(--v-bg)' }}>
      <div className="flex items-center">
        <button type="button" aria-label="Paso anterior" disabled={page === 0} onClick={back}
          className="tap w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-opacity"
          style={{ background: 'rgba(255,255,255,0.08)', opacity: page === 0 ? 0 : 1 }}>
          <Icon n="arrow_back" size={22} color="var(--v-text)" />
        </button>
        <div className="flex-1 flex gap-[3px] ml-3" aria-label={`Paso ${page + 1} de ${PAGES.length}`}>
          {PAGES.map((p, i) => (
            <button key={p.pg} type="button" aria-label={`Ir al paso ${i + 1}`} disabled={i >= page} onClick={() => { setErrors({}); setDir(-1); setPage(i); }}
              className="flex-1 h-3.5 flex items-center">
              <span className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.14)' }}>
                <span className="block h-full rounded-full transition-[width] duration-300" style={{ width: i <= page ? '100%' : '0%', background: 'var(--v-accent)' }} />
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="h-4" />
      <div key={page} className={cx('flex-1 flex flex-col min-h-0', dir > 0 ? 'onb-in-r' : 'onb-in-l')}>
        <div>
          <div className="t-label" style={{ color: 'var(--v-accent)' }}>{info.kicker}</div>
          <div className="h-2" />
          <h1 className="m-0" style={{ color: 'var(--v-text)', font: '800 38px/40px var(--font-sans)', letterSpacing: '-0.02em' }}>{info.title}</h1>
          <div className="h-1.5" />
          <p className="t-body m-0" style={{ color: 'var(--v-dim)' }}>{info.sub}</p>
        </div>
        <div className="h-5" />
        <div key={shake} className={cx('flex-1 flex flex-col justify-center min-h-0', shake > 0 && Object.keys(errors).length > 0 && 'shake')}>
          <PageBody pg={info.pg} f={f} set={set as unknown as (k: keyof FormState, v: unknown) => void} errors={errors} onDone={next} onOpenTime={setTimeFor} />
        </div>
      </div>
      <div className="h-3" />
      <LimeButton text={page === PAGES.length - 1 ? 'Generar mi plan' : 'Continuar'} onClick={next} />

      {timeFor != null && (
        <TimeSheet title={MEALS[timeFor][1]} initial={f.meals[MEALS[timeFor][0]]} onDismiss={() => setTimeFor(null)}
          onDone={(v) => { set('meals', { ...f.meals, [MEALS[timeFor][0]]: v }); setTimeFor(null); }} />
      )}
    </div>
  );
}

type FormState = {
  name: string; age: string; gender: string; weight: string; height: string; experience: string; goal: string; direction: 'Ganar' | 'Perder';
  target: string; months: string; days: number; minutes: number; workHours: string; meals: Record<string, string>; vegs: string; carbs: string; prots: string;
  specialOn: boolean; specialActivity: string; specialDay: string; specialMin: number; dish: string; dishKcal: string;
};
function PageBody({ pg, f, set: s, errors, onDone, onOpenTime }: {
  pg: Pg; f: FormState; set: (k: keyof FormState, v: unknown) => void; errors: Record<string, string>; onDone: () => void; onOpenTime: (i: number) => void;
}) {
  switch (pg) {
    case 'name': return <BigTextField value={f.name} onChange={(v) => s('name', v.slice(0, 80))} placeholder="Tu nombre o apodo" error={errors.name} onDone={onDone} autoFocus />;
    case 'age': return <BigNumberPicker value={parseInt(f.age, 10) || 25} onChange={(v) => s('age', String(v))} min={12} max={100} unit="años" />;
    case 'weight': return <BigNumberPicker value={parseNum(f.weight) ?? 70} onChange={(v) => s('weight', String(v))} min={30} max={350} step={0.5} unit="kg" />;
    case 'height': return <BigNumberPicker value={parseNum(f.height) ?? 175} onChange={(v) => s('height', String(v))} min={120} max={250} unit="cm" />;
    case 'gender': return (
      <div className="grid grid-cols-2 gap-3.5 h-[230px]">
        {([['Masculino', 'male'], ['Femenino', 'female']] as const).map(([v, icon]) => (
          <Tile key={v} selected={f.gender === v} onClick={() => s('gender', v)}>{(fg) => (<>
            <span className="flex-1" /><Icon n={icon} size={64} color={fg} /><span className="h-2.5" />
            <span style={{ color: fg, font: '700 17px/22px var(--font-sans)' }}>{v}</span>
          </>)}</Tile>
        ))}
      </div>
    );
    case 'experience': return (
      <div className="flex flex-col gap-3">
        {EXPERIENCES.map((e) => (
          <Tile key={e.title} selected={f.experience.startsWith(e.title)} onClick={() => s('experience', `${e.title} (${e.desc})`)}>{(fg, dim) => (
            <span className="flex items-center">
              <span style={{ fontSize: 34 }}>{e.emoji}</span>
              <span className="ml-4 flex flex-col">
                <span style={{ color: fg, font: '700 22px/27px var(--font-sans)' }}>{e.title}</span>
                <span className="t-body" style={{ color: dim }}>{e.desc}</span>
              </span>
            </span>
          )}</Tile>
        ))}
      </div>
    );
    case 'goal': return (
      <div className="grid grid-cols-2 gap-3">
        {GOALS.map((g) => (
          <Tile key={g.title} className="h-[170px]" selected={f.goal.includes(g.title)} onClick={() => { s('goal', `${g.title} (${g.sub})`); s('direction', g.title.includes('Perder') ? 'Perder' : 'Ganar'); }}>{(fg, dim) => (<>
            <Icon n={g.icon} size={38} color={fg} /><span className="flex-1" />
            <span style={{ color: fg, font: '700 17px/22px var(--font-sans)' }}>{g.title}</span>
            <span style={{ color: dim, font: '500 12px/16px var(--font-sans)' }}>{g.sub}</span>
          </>)}</Tile>
        ))}
      </div>
    );
    case 'direction': return (
      <div className="grid grid-cols-2 gap-3.5 h-[230px]">
        {([['Perder', 'Bajar de peso', 'trending_down'], ['Ganar', 'Subir de peso', 'trending_up']] as const).map(([v, label, icon]) => (
          <Tile key={v} selected={f.direction === v} onClick={() => s('direction', v)}>{(fg) => (<>
            <span className="flex-1" /><Icon n={icon} size={56} color={fg} /><span className="h-2.5" />
            <span style={{ color: fg, font: '700 17px/22px var(--font-sans)' }}>{label}</span>
          </>)}</Tile>
        ))}
      </div>
    );
    case 'target': return <GiantSlider value={parseNum(f.target) ?? 5} onChange={(v) => s('target', String(v))} min={1} max={50} unit="kg" error={errors.target} />;
    case 'months': return <GiantSlider value={parseInt(f.months, 10) || 3} onChange={(v) => s('months', String(v))} min={1} max={24} unit="meses" error={errors.months} />;
    case 'days': return (
      <div className="flex flex-col gap-3">
        {[[2, 3, 4], [5, 6]].map((row, ri) => (
          <div key={ri} className="grid grid-cols-3 gap-3 h-[130px]">
            {row.map((d) => (
              <Tile key={d} selected={f.days === d} onClick={() => s('days', d)}>{(fg, dim) => (<>
                <span className="flex-1" /><span style={{ color: fg, font: '800 52px/54px var(--font-sans)', letterSpacing: '-0.03em' }}>{d}</span>
                <span className="t-body" style={{ color: dim }}>días</span>
              </>)}</Tile>
            ))}
          </div>
        ))}
      </div>
    );
    case 'minutes': return (
      <div className="flex flex-col gap-3">
        {[[30, 45], [60, 90]].map((row, ri) => (
          <div key={ri} className="grid grid-cols-2 gap-3 h-[150px]">
            {row.map((m) => (
              <Tile key={m} selected={f.minutes === m} onClick={() => s('minutes', m)}>{(fg, dim) => (<>
                <span className="flex-1" /><span style={{ color: fg, font: '800 52px/54px var(--font-sans)', letterSpacing: '-0.03em' }}>{m}</span>
                <span className="t-body" style={{ color: dim }}>minutos</span>
              </>)}</Tile>
            ))}
          </div>
        ))}
      </div>
    );
    case 'work': return <BigTextField value={f.workHours} onChange={(v) => s('workHours', v.slice(0, 120))} placeholder="09:00 - 18:00" error={errors.workHours} onDone={onDone} />;
    case 'meals': return (
      <div className="flex flex-col gap-2.5 overflow-y-auto">
        {MEALS.map(([k, label, icon], i) => (
          <button key={k} type="button" onClick={() => onOpenTime(i)} className="tap flex items-center rounded-[24px] px-[18px] py-4 enter"
            style={{ background: 'var(--v-surface)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--v-accent) 30%, transparent)', ['--i' as string]: i } as CSSProperties}>
            <Icon n={icon} size={24} color="var(--v-dim)" />
            <span className="flex-1 ml-3.5 text-left" style={{ color: 'var(--v-text)', font: '700 17px/22px var(--font-sans)' }}>{label}</span>
            <span style={{ color: 'var(--v-accent)', font: '800 28px/32px var(--font-sans)' }}>{f.meals[k]}</span>
          </button>
        ))}
      </div>
    );
    case 'foods': return (
      <div className="flex flex-col gap-[18px] overflow-y-auto">
        <LabeledField label="Verduras" value={f.vegs} onChange={(v) => s('vegs', v)} placeholder="brócoli, espinaca, tomate" />
        <LabeledField label="Carbohidratos" value={f.carbs} onChange={(v) => s('carbs', v)} placeholder="arroz, papa, avena" />
        <LabeledField label="Proteínas" value={f.prots} onChange={(v) => s('prots', v)} placeholder="pollo, huevo, atún" />
      </div>
    );
    case 'special': return (
      <div className="flex flex-col gap-3.5 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 h-24">
          <Tile selected={f.specialOn} onClick={() => s('specialOn', true)}>{(fg) => (<><span className="flex-1" /><span style={{ color: fg, font: '700 17px/22px var(--font-sans)' }}>Sí, tengo</span></>)}</Tile>
          <Tile selected={!f.specialOn} onClick={() => s('specialOn', false)}>{(fg) => (<><span className="flex-1" /><span style={{ color: fg, font: '700 17px/22px var(--font-sans)' }}>No por ahora</span></>)}</Tile>
        </div>
        {f.specialOn && (
          <div className="flex flex-col gap-3.5 fade-in">
            <LabeledField label="Actividad" value={f.specialActivity} onChange={(v) => s('specialActivity', v.slice(0, 60))} placeholder="Pádel" />
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {DAYS.map((d) => <Chip key={d} text={d} selected={f.specialDay.toLowerCase() === d.toLowerCase()} onClick={() => s('specialDay', d)} />)}
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {[30, 45, 60, 90].map((m) => <Chip key={m} text={`${m} min`} selected={f.specialMin === m} onClick={() => s('specialMin', m)} />)}
            </div>
          </div>
        )}
      </div>
    );
    case 'dish': return (
      <div className="flex flex-col gap-[18px] overflow-y-auto">
        <LabeledField label="Ingredientes" value={f.dish} onChange={(v) => s('dish', v.slice(0, 200))} placeholder="arroz, lentejas, tomate, queso feta" />
        <LabeledField label="Calorías objetivo" value={f.dishKcal} onChange={(v) => s('dishKcal', v.replace(/\D/g, '').slice(0, 4))} placeholder="390" suffix="kcal" error={errors.dishKcal} numeric />
      </div>
    );
  }
}

/** Mosaico seleccionable: relleno de acento al elegir, borde fino si no, rebote al pulsar. */
function Tile({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: (fg: string, dim: string) => ReactNode; className?: string }) {
  const fg = selected ? ON_ACCENT : 'var(--v-text)';
  const dim = selected ? 'rgba(10,10,10,0.7)' : 'var(--v-dim)';
  return (
    <button type="button" aria-pressed={selected} onClick={() => { Haptics.selection(); onClick(); }}
      className={cx('tap flex flex-col items-start text-left rounded-[28px] p-5 transition-[background,transform] duration-200', className)}
      style={{
        background: selected ? 'var(--v-accent)' : 'var(--v-surface)', transform: selected ? 'scale(1.025)' : undefined,
        boxShadow: selected ? undefined : 'inset 0 0 0 1px color-mix(in srgb, var(--v-accent) 30%, transparent)',
      }}>
      {children(fg, dim)}
    </button>
  );
}

function Chip({ text, selected, onClick }: { text: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={selected} onClick={() => { Haptics.selection(); onClick(); }}
      className={cx('tap shrink-0 h-10 px-4 rounded-full t-card', selected && 'pop')}
      style={{ background: selected ? 'var(--v-accent)' : 'var(--v-surface2)', color: selected ? ON_ACCENT : 'var(--v-text)' }}>{text}</button>
  );
}

/** Campo de texto enorme con subrayado de acento (sin caja). */
function BigTextField({ value, onChange, placeholder, error, onDone, size = 30, suffix, numeric, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder: string; error?: string; onDone?: () => void; size?: number; suffix?: string; numeric?: boolean; autoFocus?: boolean;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center py-3">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
          inputMode={numeric ? 'numeric' : undefined} onKeyDown={(e) => { if (e.key === 'Enter') onDone?.(); }}
          className="flex-1 min-w-0 bg-transparent outline-none placeholder:opacity-45"
          style={{ color: 'var(--v-text)', font: `800 ${size}px/${Math.round(size * 1.25)}px var(--font-sans)`, letterSpacing: '-0.02em', caretColor: 'var(--v-accent)' }} />
        {suffix && <span style={{ color: 'var(--v-dim)', font: '700 17px/22px var(--font-sans)' }}>{suffix}</span>}
      </div>
      <div className="h-[3px] rounded-full" style={{ background: error ? 'var(--v-danger)' : 'var(--v-accent)' }} />
      {error && <p className="t-body mt-2 mb-0" style={{ color: 'var(--v-danger)' }}>{error}</p>}
    </div>
  );
}

function LabeledField(p: { label: string; value: string; onChange: (v: string) => void; placeholder: string; error?: string; suffix?: string; numeric?: boolean }) {
  return (
    <div>
      <div className="t-label" style={{ color: 'var(--v-dim)' }}>{p.label}</div>
      <BigTextField value={p.value} onChange={p.onChange} placeholder={p.placeholder} error={p.error} suffix={p.suffix} numeric={p.numeric} size={22} />
    </div>
  );
}

/** Rueda numérica vertical con imán: 5 filas, la central resaltada. */
function BigNumberPicker({ value, onChange, min, max, step = 1, unit, itemHeight = 60, fontSize = 44 }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string; itemHeight?: number; fontSize?: number;
}) {
  const count = Math.round((max - min) / step) + 1;
  const idxOf = (v: number) => Math.min(count - 1, Math.max(0, Math.round((v - min) / step)));
  const ref = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(idxOf(value) * itemHeight);
  const last = useRef(idxOf(value));
  useLayoutEffect(() => { if (ref.current) ref.current.scrollTop = idxOf(value) * itemHeight; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    setScroll(el.scrollTop);
    const i = Math.min(count - 1, Math.max(0, Math.round(el.scrollTop / itemHeight)));
    if (i !== last.current) { last.current = i; Haptics.selection(); onChange(+(min + i * step).toFixed(1)); }
  };
  const decimals = step % 1 !== 0 ? 1 : 0;
  const nudge = (d: number) => ref.current?.scrollBy({ top: d * itemHeight, behavior: 'smooth' });
  return (
    <div className="relative w-full" style={{ height: itemHeight * 5 }}
      onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); nudge(-1); } if (e.key === 'ArrowDown') { e.preventDefault(); nudge(1); } }}>
      <div className="absolute inset-x-0 rounded-[24px]" style={{ top: itemHeight * 2, height: itemHeight, background: 'var(--v-surface2)' }} />
      <div ref={ref} onScroll={onScroll} tabIndex={0} role="spinbutton" aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} aria-label={unit}
        className="absolute inset-0 overflow-y-auto no-scrollbar outline-none" style={{ scrollSnapType: 'y mandatory', paddingTop: itemHeight * 2, paddingBottom: itemHeight * 2 }}>
        {Array.from({ length: count }, (_, i) => {
          const d = Math.abs(i * itemHeight - scroll) / itemHeight;
          const k = Math.max(0, Math.min(1, 1 - d / 2.4));
          return (
            <div key={i} className="flex items-center justify-center" style={{ height: itemHeight, scrollSnapAlign: 'center', opacity: 0.1 + 0.9 * k * k, transform: `scale(${0.55 + 0.45 * k})` }}>
              <span style={{ color: 'var(--v-accent)', font: `800 ${fontSize}px/1 var(--font-display)`, letterSpacing: '-0.02em' }}>{(min + i * step).toFixed(decimals).replace('.', ',')}</span>
            </div>
          );
        })}
      </div>
      {unit && <span className="absolute right-7 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--v-dim)', font: '700 17px/22px var(--font-sans)' }}>{unit}</span>}
    </div>
  );
}

/** Valor gigante con dígitos rodantes + deslizador. */
function GiantSlider({ value, onChange, min, max, unit, error }: { value: number; onChange: (v: number) => void; min: number; max: number; unit: string; error?: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex items-end">
        <span key={value} className="roll-up" style={{ color: 'var(--v-accent)', font: '800 120px/124px var(--font-display)', letterSpacing: '-0.03em' }}>{Math.round(value)}</span>
        <span className="ml-2 mb-5" style={{ color: 'var(--v-accent)', font: '700 22px/27px var(--font-sans)' }}>{unit}</span>
      </div>
      <div className="h-6" />
      <input type="range" min={min} max={max} step={1} value={value} aria-label={unit}
        onChange={(e) => { const v = Number(e.target.value); if (v !== value) { Haptics.selection(); onChange(v); } }}
        className="v-range w-full" style={{ ['--p' as string]: `${pct}%` } as CSSProperties} />
      <div className="flex w-full justify-between mt-1">
        <span className="t-body" style={{ color: 'var(--v-dim)' }}>{min}</span>
        <span className="t-body" style={{ color: 'var(--v-dim)' }}>{max}</span>
      </div>
      {error && <p className="t-body mt-3 mb-0" style={{ color: 'var(--v-danger)' }}>{error}</p>}
    </div>
  );
}

/** Selector de hora: dos ruedas (horas / minutos) en hoja inferior. */
function TimeSheet({ title, initial, onDone, onDismiss }: { title: string; initial: string; onDone: (v: string) => void; onDismiss: () => void }) {
  const [h0, m0] = initial.split(':').map((x) => parseInt(x, 10));
  const [h, setH] = useState(Number.isFinite(h0) ? h0 : 12);
  const [m, setM] = useState(Number.isFinite(m0) ? m0 : 0);
  return (
    <GlassSheet onDismiss={onDismiss} label={title}>
      <div className="px-6 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="t-label" style={{ color: 'var(--v-accent)' }}>{title}</div>
        <div className="flex items-center mt-1">
          <div className="flex-1"><BigNumberPicker value={h} onChange={setH} min={0} max={23} itemHeight={52} fontSize={40} /></div>
          <span className="px-2" style={{ color: 'var(--v-text)', font: '800 40px/44px var(--font-display)' }}>:</span>
          <div className="flex-1"><BigNumberPicker value={m} onChange={setM} min={0} max={59} itemHeight={52} fontSize={40} /></div>
        </div>
        <div className="h-4" />
        <LimeButton text="Listo" onClick={() => onDone(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)} />
      </div>
    </GlassSheet>
  );
}

/** "Creando tu plan": tres anillos que se dibujan, porcentaje, frases que rotan y pasos con check. */
function GeneratingPlan() {
  const [t0] = useState(() => performance.now());
  const [now, setNow] = useState(t0);
  useEffect(() => { let raf = 0; const loop = (t: number) => { setNow(t); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf); }, []);
  const el = now - t0;
  const ease = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const p = [0.94 * ease(el / 40000), 0.86 * ease(Math.max(0, el - 500) / 40000), 0.78 * ease(Math.max(0, el - 1000) / 40000)];
  const stage = Math.min(PLAN_STEPS.length - 1, Math.floor(el / 3200));
  const phrase = Math.floor(el / 4500) % PLAN_PHRASES.length;
  const size = 250;
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-7" style={{ background: 'var(--v-bg)' }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full -rotate-90" aria-hidden>
          {p.map((v, i) => {
            const sw = 7 - i;
            const d = size * (1 - i * 0.14) - sw;
            const r = d / 2;
            const c = 2 * Math.PI * r;
            return (
              <g key={i}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--v-accent)" strokeOpacity={0.18} strokeWidth={sw * 2} strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--v-accent)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} />
              </g>
            );
          })}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--v-accent)', font: '800 40px/44px var(--font-display)' }}>{Math.floor((p[0] / 0.94) * 99)}%</span>
      </div>
      <div className="h-7" />
      <h1 className="m-0 text-center" style={{ color: 'var(--v-text)', font: '800 32px/36px var(--font-sans)', letterSpacing: '-0.02em' }}>Creando tu plan</h1>
      <p key={phrase} className="t-body text-center mt-2 mb-0 min-h-11 roll-up max-w-[360px]" style={{ color: 'var(--v-dim)' }}>{PLAN_PHRASES[phrase]}</p>
      <div className="h-5" />
      <div className="flex flex-col gap-2.5 w-full max-w-[360px]">
        {PLAN_STEPS.slice(0, stage + 1).map((label, i) => (
          <div key={label} className="flex items-center enter">
            {i < stage ? (
              <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center pop" style={{ background: 'var(--v-accent)' }}><Icon n="check" size={15} color={ON_ACCENT} /></span>
            ) : (
              <span className="w-[22px] h-[22px] flex items-center justify-center"><span className="w-[9px] h-[9px] rounded-full breathe" style={{ background: 'var(--v-accent)' }} /></span>
            )}
            <span className="t-body ml-3" style={{ color: i < stage ? 'var(--v-dim)' : 'var(--v-text)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
