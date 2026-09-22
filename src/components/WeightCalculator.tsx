import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, ChevronDown, ChevronUp, Lightbulb, ArrowRight, Plus, Minus } from 'lucide-react';
import { numberRoll, iosSheetSpring } from '../lib/motion';

// ─── Exercise type detection ─────────────────────────────────────────────────

export type ExerciseCategory = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight';

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
    // silently fail in restricted environments
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeightCalculatorProps {
  exerciseId: string;
  exerciseName: string;
  /** Recommended total weight from AI / routine (0 = not set) */
  targetWeight: number;
  /** User's body weight from profile (for bodyweight exercises) */
  userBodyweight?: number;
  /** Called whenever calculator updates the effective total weight */
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

  // ── Emit to parent on change ─────────────────────────────────────────────
  useEffect(() => {
    if (total > 0) {
      onWeightChange(total);
    }
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
  const gap = targetWeight > 0 ? Math.round((targetWeight - total) * 10) / 10 : 0;
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
      {/* Toggle button with Apple HIG 44px hit target */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full min-h-[44px] px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-300 hover:text-white rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all active:scale-[0.99] touch-manipulation"
      >
        <div className="flex items-center gap-2">
          <Wrench size={14} className="text-[var(--app-accent)]" />
          <span className="tracking-tight">Calculadora de carga y discos</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-gray-400 bg-white/5 border border-white/5">
            {categoryLabel[category]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400">
          <span className="text-[11px] font-mono tabular-nums text-white/80">
            {total > 0 ? `${total} kg` : 'Configurar'}
          </span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="calc-panel"
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={iosSheetSpring}
            className="overflow-hidden"
          >
            <div className="mt-3 neuro-inset rounded-2xl p-4 space-y-4 border border-white/10 relative">
              {/* Grabber indicator */}
              <div className="w-8 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2" />

              {/* Goal badge */}
              {targetWeight > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-mono">
                  <span className="text-gray-400 font-sans">Meta sugerida por IA:</span>
                  <span className="app-accent font-bold tabular-nums">{targetWeight} kg total</span>
                </div>
              )}

              {barbellOnlyWarning && (
                <div className="text-xs text-amber-300 font-medium bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  ⚠️ La meta ({targetWeight} kg) es menor que la barra sola ({barbellKg} kg). Usa una barra de menor peso o la barra sin carga.
                </div>
              )}

              {/* ── Barbell mode ── */}
              {category === 'barbell' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-2 font-mono uppercase tracking-wider">
                      Tipo de barra
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {BARBELL_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setBarbellKg(opt.value)}
                          className={`min-h-[44px] px-2 py-2 text-xs font-semibold rounded-xl border flex flex-col items-center justify-center transition-all active:scale-95 touch-manipulation ${
                            barbellKg === opt.value
                              ? 'border-[color:var(--app-accent)]/80 bg-[color:var(--app-accent)]/15 text-[var(--app-accent)] font-bold shadow-[0_0_12px_rgba(57,255,20,0.2)]'
                              : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20'
                          }`}
                        >
                          <span className="font-mono tabular-nums text-sm font-bold">{opt.value} kg</span>
                          <span className="text-[10px] text-gray-400 truncate max-w-full">
                            {opt.value === 20 ? 'Olímpica' : opt.value === 15 ? 'Mujer' : 'Pesada'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11px] text-gray-400 font-mono uppercase tracking-wider">
                        Discos por lado
                      </label>
                      {targetWeight > 0 && (
                        <button
                          type="button"
                          onClick={handleSuggestPlates}
                          className="min-h-[32px] px-3 py-1 flex items-center gap-1.5 text-xs font-semibold rounded-lg bg-[color:var(--app-accent)]/10 text-[var(--app-accent)] border border-[color:var(--app-accent)]/30 hover:bg-[color:var(--app-accent)]/20 active:scale-95 transition-all"
                        >
                          <Lightbulb size={12} />
                          Sugerir discos
                        </button>
                      )}
                    </div>

                    {/* Stepper + Input */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Restar 2.5 kg por lado"
                        onClick={() => setPlatesPerSide((prev) => Math.max(0, Math.round((prev - 2.5) * 100) / 100))}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
                      >
                        <Minus size={16} />
                      </button>

                      <div className="flex-1 relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={1.25}
                          value={platesPerSide === 0 ? '' : platesPerSide}
                          onChange={(e) => setPlatesPerSide(Math.max(0, Number(e.target.value)))}
                          placeholder="0"
                          className="w-full h-11 input-field rounded-xl text-xl font-bold font-mono tabular-nums text-center text-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono pointer-events-none">
                          kg/lado
                        </span>
                      </div>

                      <button
                        type="button"
                        aria-label="Añadir 2.5 kg por lado"
                        onClick={() => setPlatesPerSide((prev) => Math.round((prev + 2.5) * 100) / 100)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    {/* Quick plate selection chips */}
                    <div className="flex gap-1.5 flex-wrap mt-2.5">
                      {PLATE_OPTIONS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPlatesPerSide(p)}
                          className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-all active:scale-95 ${
                            platesPerSide === p
                              ? 'border-[color:var(--app-accent)] bg-[color:var(--app-accent)]/20 text-[var(--app-accent)]'
                              : 'border-white/10 bg-white/[0.03] text-gray-400 hover:text-white'
                          }`}
                        >
                          +{p}k
                        </button>
                      ))}
                    </div>

                    {platesPerSide > 0 && (
                      <p className="mt-2 text-xs text-gray-400 font-mono tabular-nums">
                        {barbellKg} kg barra + ({platesPerSide} × 2) kg discos = <strong className="text-white">{total} kg</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Dumbbell mode ── */}
              {category === 'dumbbell' && (
                <div className="space-y-3">
                  <label className="block text-[11px] text-gray-400 font-mono uppercase tracking-wider">
                    Peso por mancuerna
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Restar 2 kg por mancuerna"
                      onClick={() => setDumbbellKg((prev) => Math.max(0, prev - 2))}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={1}
                        value={dumbbellKg === 0 ? '' : dumbbellKg}
                        onChange={(e) => setDumbbellKg(Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-full h-11 input-field rounded-xl text-xl font-bold font-mono tabular-nums text-center text-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono pointer-events-none">
                        kg/mano
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="Añadir 2 kg por mancuerna"
                      onClick={() => setDumbbellKg((prev) => prev + 2)}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {dumbbellKg > 0 && (
                    <p className="text-xs text-gray-400 font-mono tabular-nums">
                      {dumbbellKg} kg × 2 brazos = <strong className="text-white">{total} kg total</strong>
                    </p>
                  )}
                </div>
              )}

              {/* ── Machine mode ── */}
              {category === 'machine' && (
                <div className="space-y-3">
                  <label className="block text-[11px] text-gray-400 font-mono uppercase tracking-wider">
                    Placas o selector de máquina
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Restar 5 kg"
                      onClick={() => setMachineKg((prev) => Math.max(0, prev - 5))}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={5}
                        value={machineKg === 0 ? '' : machineKg}
                        onChange={(e) => setMachineKg(Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-full h-11 input-field rounded-xl text-xl font-bold font-mono tabular-nums text-center text-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono pointer-events-none">
                        kg
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="Añadir 5 kg"
                      onClick={() => setMachineKg((prev) => prev + 5)}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Bodyweight mode ── */}
              {category === 'bodyweight' && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-gray-300">
                  {userBodyweight > 0 ? (
                    <span className="font-mono tabular-nums">
                      Peso corporal de referencia: <strong className="text-white">{userBodyweight} kg</strong>
                    </span>
                  ) : (
                    <span className="text-gray-400">Peso corporal estándar</span>
                  )}
                </div>
              )}

              {/* ── Total weight display & Quick Apply ── */}
              {total > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div>
                    <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-0.5">
                      Peso total resultante
                    </p>
                    <div className="flex items-baseline gap-1.5 overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={total}
                          {...numberRoll}
                          className="text-2xl font-black app-accent font-mono tabular-nums glow-text"
                        >
                          {total}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-xs text-gray-400 font-mono">kg</span>
                    </div>

                    {/* Gap to goal */}
                    {targetWeight > 0 && !barbellOnlyWarning && (
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={gap}
                          {...numberRoll}
                          className={`text-[11px] font-mono tabular-nums mt-0.5 ${
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

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onWeightChange(total)}
                    className="min-h-[44px] px-4 py-2.5 flex items-center gap-2 text-xs font-bold primary-btn rounded-xl shadow-md touch-manipulation"
                  >
                    Usar
                    <ArrowRight size={14} />
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
