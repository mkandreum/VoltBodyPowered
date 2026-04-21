import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, ChevronDown, ChevronUp, Lightbulb, ArrowRight } from 'lucide-react';
import { numberRoll } from '../lib/motion';

// ─── Exercise type detection ─────────────────────────────────────────────────

type ExerciseCategory = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight';

const BARBELL_KEYWORDS = [
  'banca', 'press de banca', 'sentadilla', 'peso muerto', 'press militar',
  'remo con barra', 'jalón', 'dominada', 'press banca', 'rumano',
  'press francés', 'barra', 'hip thrust', 'curl con barra',
];

const DUMBBELL_KEYWORDS = [
  'mancuerna', 'curl de bíceps', 'curl martillo', 'press inclinado con mancuernas',
  'aperturas', 'elevaciones laterales', 'pájaros', 'press con mancuernas',
  'curl de biceps', 'press de hombros',
];

const BODYWEIGHT_KEYWORDS = [
  'dominadas asistidas', 'fondos en paralelas', 'fondos', 'flexiones',
  'plancha', 'burpees', 'sentadilla búlgara', 'step',
];

const MACHINE_KEYWORDS = [
  'polea', 'prensa', 'cable', 'extensión', 'face pull', 'máquina',
  'jalón al pecho', 'remo en cable', 'extensión de tríceps',
];

export function detectExerciseCategory(name: string): ExerciseCategory {
  const lower = name.toLowerCase();
  if (BODYWEIGHT_KEYWORDS.some((k) => lower.includes(k))) return 'bodyweight';
  if (DUMBBELL_KEYWORDS.some((k) => lower.includes(k))) return 'dumbbell';
  if (BARBELL_KEYWORDS.some((k) => lower.includes(k))) return 'barbell';
  if (MACHINE_KEYWORDS.some((k) => lower.includes(k))) return 'machine';
  // Default heuristic: if name mentions barbell-ish compound exercises, barbell
  return 'machine';
}

// ─── Available plate sizes (kg per side) ─────────────────────────────────────
const PLATE_OPTIONS = [1.25, 2.5, 5, 10, 15, 20, 25] as const;
const BARBELL_OPTIONS = [
  { label: 'Barra Olímpica (20 kg)', value: 20 },
  { label: 'Barra Mujer (15 kg)', value: 15 },
  { label: 'Barra Pesada (25 kg)', value: 25 },
] as const;

function roundToPlate(kg: number): number {
  // Round to nearest available plate size (from PLATE_OPTIONS)
  const sorted = [...PLATE_OPTIONS].sort((a, b) => a - b);
  let best = sorted[0];
  for (const p of sorted) {
    if (Math.abs(p - kg) < Math.abs(best - kg)) best = p;
  }
  return best;
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

interface CalcConfig {
  barbellKg: number;
  platesPerSide: number;
  dumbbellKg: number;
}

function loadConfig(exerciseId: string): Partial<CalcConfig> {
  try {
    const raw = localStorage.getItem(`wc-${exerciseId}`);
    return raw ? (JSON.parse(raw) as Partial<CalcConfig>) : {};
  } catch {
    return {};
  }
}

function saveConfig(exerciseId: string, config: CalcConfig) {
  try {
    localStorage.setItem(`wc-${exerciseId}`, JSON.stringify(config));
  } catch {
    // silently fail (private mode)
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeightCalculatorProps {
  exerciseId: string;
  exerciseName: string;
  /** Recommended total weight from the AI / routine (0 = not set) */
  targetWeight: number;
  /** User's body weight from profile (for bodyweight exercises) */
  userBodyweight?: number;
  /** Called whenever the calculator updates the effective total weight */
  onWeightChange: (weight: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeightCalculator({
  exerciseId,
  exerciseName,
  targetWeight,
  userBodyweight = 0,
  onWeightChange,
}: WeightCalculatorProps) {
  const category = detectExerciseCategory(exerciseName);
  const saved = loadConfig(exerciseId);

  const [open, setOpen] = useState(false);
  const [barbellKg, setBarbellKg] = useState<number>(saved.barbellKg ?? 20);
  const [platesPerSide, setPlatesPerSide] = useState<number>(saved.platesPerSide ?? 0);
  const [dumbbellKg, setDumbbellKg] = useState<number>(saved.dumbbellKg ?? 0);
  const [machineKg, setMachineKg] = useState<number>(targetWeight > 0 ? targetWeight : 0);

  // ── Derived total ────────────────────────────────────────────────────────
  const total = (() => {
    switch (category) {
      case 'barbell':
        return barbellKg + platesPerSide * 2;
      case 'dumbbell':
        return dumbbellKg * 2;
      case 'machine':
        return machineKg;
      case 'bodyweight':
        return userBodyweight;
    }
  })();

  // ── Emit to parent on every change ──────────────────────────────────────
  useEffect(() => {
    if (total > 0) {
      onWeightChange(total);
    }
  // `onWeightChange` is intentionally excluded: it is an inline arrow defined
  // in Workout.tsx on every render. Including it would cause an infinite loop
  // because each call to onWeightChange (setWeightInput) triggers a Workout
  // re-render which creates a new onWeightChange reference.
  // The effect is safe to re-run only when `total` changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // ── Persist config on change ─────────────────────────────────────────────
  const persistConfig = useCallback(() => {
    saveConfig(exerciseId, { barbellKg, platesPerSide, dumbbellKg });
  }, [exerciseId, barbellKg, platesPerSide, dumbbellKg]);

  useEffect(() => {
    persistConfig();
  }, [persistConfig]);

  // ── Suggest plates logic ─────────────────────────────────────────────────
  const handleSuggestPlates = () => {
    if (category !== 'barbell' || targetWeight <= 0) return;
    const needed = (targetWeight - barbellKg) / 2;
    if (needed <= 0) {
      setPlatesPerSide(0);
    } else {
      setPlatesPerSide(roundToPlate(needed));
    }
  };

  // ── Gap to goal ──────────────────────────────────────────────────────────
  const gap = targetWeight > 0 ? targetWeight - total : 0;
  const barbellOnlyWarning =
    category === 'barbell' && targetWeight > 0 && targetWeight < barbellKg;

  // ── Category label ───────────────────────────────────────────────────────
  const categoryLabel: Record<ExerciseCategory, string> = {
    barbell: '🏋️ Con barra',
    dumbbell: '💪 Mancuernas',
    machine: '⚙️ Máquina / Cable',
    bodyweight: '🤸 Peso corporal',
  };

  return (
    <div className="mb-4">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v: boolean) => !v)}
        className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-[var(--app-accent)] transition-colors tap-target anim-tap-haptic"
      >
        <Wrench size={13} />
        <span>Calcular peso</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        <span className="ml-1 neuro-inset px-2 py-0.5 rounded-full text-[10px] font-mono text-gray-500">
          {categoryLabel[category]}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="calc-panel"
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="mt-3 neuro-inset rounded-2xl p-4 space-y-4">
              {/* Goal badge */}
              {targetWeight > 0 && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-gray-500">Meta IA:</span>
                  <span className="app-accent font-bold">{targetWeight} kg total</span>
                </div>
              )}

              {barbellOnlyWarning && (
                <div className="text-xs text-amber-400 font-semibold bg-amber-400/10 rounded-xl px-3 py-2">
                  ⚠️ La meta ({targetWeight} kg) es menor que la barra sola ({barbellKg} kg). Usa una barra más ligera o trabaja solo con la barra.
                </div>
              )}

              {/* ── Barbell mode ── */}
              {category === 'barbell' && (
                <>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1.5 font-mono uppercase tracking-wider">
                      Tipo de barra
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {BARBELL_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setBarbellKg(opt.value)}
                          className={`text-xs px-3 py-1.5 rounded-xl border transition-all tap-target ${
                            barbellKg === opt.value
                              ? 'border-[color:var(--app-accent)]/60 bg-[color:var(--app-accent)]/10 text-[var(--app-accent)]'
                              : 'neuro-raised text-gray-400'
                          }`}
                        >
                          {opt.value} kg
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1.5 font-mono uppercase tracking-wider">
                      Discos por lado (kg)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={2.5}
                        value={platesPerSide || ''}
                        onChange={(e) => setPlatesPerSide(Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-24 input-field rounded-xl p-3 text-xl font-bold text-center"
                      />
                      <span className="text-xs text-gray-500 font-mono">× 2 lados</span>
                      {targetWeight > 0 && (
                        <button
                          type="button"
                          onClick={handleSuggestPlates}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 neuro-raised rounded-xl text-[var(--app-accent)] tap-target"
                        >
                          <Lightbulb size={12} />
                          Sugerir discos
                        </button>
                      )}
                    </div>
                    {platesPerSide > 0 && (
                      <p className="mt-1.5 text-[11px] text-gray-500 font-mono">
                        {platesPerSide} kg × 2 = {platesPerSide * 2} kg en discos
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* ── Dumbbell mode ── */}
              {category === 'dumbbell' && (
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1.5 font-mono uppercase tracking-wider">
                    Peso por mancuerna (kg)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      value={dumbbellKg || ''}
                      onChange={(e) => setDumbbellKg(Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className="w-24 input-field rounded-xl p-3 text-xl font-bold text-center"
                    />
                    <span className="text-xs text-gray-500 font-mono">× 2 brazos</span>
                  </div>
                  {dumbbellKg > 0 && (
                    <p className="mt-1.5 text-[11px] text-gray-500 font-mono">
                      {dumbbellKg} kg c/brazo
                    </p>
                  )}
                </div>
              )}

              {/* ── Machine mode ── */}
              {category === 'machine' && (
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1.5 font-mono uppercase tracking-wider">
                    Peso en máquina (kg)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={5}
                    value={machineKg || ''}
                    onChange={(e) => setMachineKg(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-24 input-field rounded-xl p-3 text-xl font-bold text-center"
                  />
                </div>
              )}

              {/* ── Bodyweight mode ── */}
              {category === 'bodyweight' && (
                <div className="text-sm text-gray-400">
                  {userBodyweight > 0 ? (
                    <span>
                      Peso corporal: <span className="text-white font-bold">{userBodyweight} kg</span>
                    </span>
                  ) : (
                    <span className="text-gray-600">Sin peso adicional</span>
                  )}
                </div>
              )}

              {/* ── Total weight display ── */}
              {total > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-[var(--app-border)]">
                  <div>
                    <p className="text-[11px] text-gray-500 font-mono uppercase tracking-wider mb-0.5">
                      Peso total calculado
                    </p>
                    <div className="flex items-baseline gap-1.5 overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={total}
                          {...numberRoll}
                          className="text-2xl font-black app-accent glow-text"
                        >
                          {total}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-sm text-gray-400 font-mono">kg</span>
                    </div>

                    {/* Gap to goal */}
                    {targetWeight > 0 && !barbellOnlyWarning && (
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={gap}
                          {...numberRoll}
                          className={`text-[11px] font-mono mt-0.5 ${
                            gap === 0
                              ? 'text-emerald-400'
                              : gap > 0
                              ? 'text-amber-400'
                              : 'text-sky-400'
                          }`}
                        >
                          {gap === 0
                            ? '✅ Exactamente en la meta'
                            : gap > 0
                            ? `${gap} kg por debajo de la meta`
                            : `${Math.abs(gap)} kg por encima de la meta`}
                        </motion.p>
                      </AnimatePresence>
                    )}
                  </div>

                  {/* Use this weight CTA */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    transition={{ duration: 0.14, ease: [0.34, 1.2, 0.64, 1] }}
                    onClick={() => onWeightChange(total)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 primary-btn rounded-xl tap-target"
                  >
                    Usar
                    <ArrowRight size={13} />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
