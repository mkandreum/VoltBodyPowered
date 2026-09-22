import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/useAppStore';
import { Haptics } from '../lib/haptics';
import { authService } from '../services/authService';
import { workoutService } from '../services/workoutService';
import {
  User,
  LogOut,
  Activity,
  Target,
  Clock,
  Scale,
  Ruler,
  Camera,
  Plus,
  Edit2,
  Check,
  Palette,
  Quote,
  TrendingUp,
  Trophy,
  Bell,
  X,
  Shield,
  ChevronRight,
  Calendar,
  Sparkles,
  Flame
} from 'lucide-react';
import {
  checkBounce,
  numberRoll,
  mobileCardEntrance,
  modalReveal,
  lightboxZoom,
  backdropFade,
  elasticPop,
  progressFill
} from '../lib/motion';
import { format, subWeeks, startOfWeek } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { notificationService } from '../services/notificationService';

export default function Profile() {
  const {
    profile,
    profilePhoto,
    progressPhotos,
    setProfilePhoto,
    addProgressPhoto,
    updateProfile,
    logout,
    theme,
    setTheme,
    motivationPhrase,
    motivationPhoto,
    setMotivationPhrase,
    setMotivationPhoto,
    authToken,
    showToast,
    logs,
    routine,
    weightLogs,
    addWeightLog,
    weeklyGoals,
    toggleWeeklyGoal,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useAppStore(
    useShallow((s) => ({
      profile: s.profile,
      profilePhoto: s.profilePhoto,
      progressPhotos: s.progressPhotos,
      setProfilePhoto: s.setProfilePhoto,
      addProgressPhoto: s.addProgressPhoto,
      updateProfile: s.updateProfile,
      logout: s.logout,
      theme: s.theme,
      setTheme: s.setTheme,
      motivationPhrase: s.motivationPhrase,
      motivationPhoto: s.motivationPhoto,
      setMotivationPhrase: s.setMotivationPhrase,
      setMotivationPhoto: s.setMotivationPhoto,
      authToken: s.authToken,
      showToast: s.showToast,
      logs: s.logs,
      routine: s.routine,
      weightLogs: s.weightLogs,
      addWeightLog: s.addWeightLog,
      weeklyGoals: s.weeklyGoals,
      toggleWeeklyGoal: s.toggleWeeklyGoal,
      notificationsEnabled: s.notificationsEnabled,
      setNotificationsEnabled: s.setNotificationsEnabled,
    }))
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressInputRef = useRef<HTMLInputElement>(null);
  const motivationInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    weight: String(profile?.weight || ''),
    height: String(profile?.height || ''),
  });
  const [weightInput, setWeightInput] = useState<string>('');
  const [showRankModal, setShowRankModal] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const todayDateKey = format(new Date(), 'yyyy-MM-dd');
  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const nextWeekStart = format(startOfWeek(new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const alreadyLoggedThisWeek = weightLogs.some((l) => l.date >= currentWeekStart && l.date < nextWeekStart);
  const lastWeightLog = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;

  const weightChartData = useMemo(() => {
    const logByWeekStart = new Map(
      weightLogs.map((l) => [format(startOfWeek(new Date(l.date), { weekStartsOn: 1 }), 'yyyy-MM-dd'), l.weight])
    );
    return Array.from({ length: 8 }, (_, i) => {
      const weekDate = subWeeks(new Date(), 7 - i);
      const weekStart = format(startOfWeek(weekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      return { week: `S${i + 1}`, peso: logByWeekStart.get(weekStart) ?? null };
    });
  }, [weightLogs]);

  const personalRecordsList = useMemo(() => {
    const exerciseNames = new Map<string, string>();
    for (const day of routine) {
      for (const ex of day.exercises ?? []) {
        exerciseNames.set(ex.id, ex.name);
      }
    }
    const prMap = new Map<string, { weight: number; reps: number; date: string; name: string }>();
    for (const log of logs) {
      const existing = prMap.get(log.exerciseId);
      if (!existing || log.weight > existing.weight) {
        prMap.set(log.exerciseId, {
          weight: log.weight,
          reps: log.reps,
          date: log.date.slice(0, 10),
          name: exerciseNames.get(log.exerciseId) || log.exerciseId,
        });
      }
    }
    return Array.from(prMap.values())
      .filter((p) => p.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);
  }, [logs, routine]);

  const completedGoals = weeklyGoals.filter((goal) => goal.done).length;
  const weeklyGoalProgress = Math.round((completedGoals / Math.max(1, weeklyGoals.length)) * 100);

  const strengthScore = Math.min(100, logs.length * 4);
  const consistencyScore = weeklyGoalProgress;
  const energyScore = Math.min(100, Math.max(30, weightLogs.length * 18));

  const rankInfo = useMemo(() => {
    const ranks = [
      { min: 0, max: 30, name: 'Recluta de Bronce', emoji: '🛡️', desc: 'Estás comenzando tu camino de acero.', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
      { min: 30, max: 60, name: 'Guerrero de Acero', emoji: '⚔️', desc: 'Has forjado las bases de tu consistencia.', color: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/20' },
      { min: 60, max: 85, name: 'Campeón del Neón', emoji: '⚡', desc: '¡Increíble! Brillas en cada entreno.', color: 'text-cyan-400 glow-text', bg: 'bg-cyan-500/10', border: 'border-cyan-400/25' },
      { min: 85, max: 101, name: 'Cyborg Supremo', emoji: '🤖', desc: 'Eres una máquina imparable.', color: 'text-[color:var(--app-accent)] glow-text', bg: 'bg-[color:var(--app-accent)]/10', border: 'border-[color:var(--app-accent)]/25' },
    ];
    return ranks.find(r => consistencyScore >= r.min && consistencyScore < r.max) || ranks[0];
  }, [consistencyScore]);

  if (!profile) return null;

  const handleLogWeight = async () => {
    const val = Number(weightInput);
    if (!val || val < 20 || val > 400) return;
    addWeightLog({ date: todayDateKey, weight: val });
    setWeightInput('');
    showToast({ type: 'success', title: `Peso registrado: ${val} kg ⚖️` });
    if (authToken) {
      try { await workoutService.saveWeightLog(authToken, { date: todayDateKey, weight: val }); } catch { /* silent */ }
    }
  };

  const persistProfilePatch = async (patch: Record<string, unknown>, silent = true) => {
    if (!authToken) return;
    try {
      await authService.updateProfile(authToken, patch);
      if (!silent) showToast({ type: 'success', title: 'Perfil actualizado' });
    } catch {
      if (!silent) showToast({ type: 'error', title: 'No se pudo guardar', message: 'Reintenta en unos segundos.' });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'progress' | 'motivation') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      if (type === 'profile') {
        const photo = reader.result as string;
        setProfilePhoto(photo);
        await persistProfilePatch({ profilePhoto: photo });
      } else if (type === 'progress') {
        const newPhoto = { date: new Date().toISOString(), url: reader.result as string };
        addProgressPhoto(newPhoto);
        if (authToken) {
          try { await workoutService.addPhoto(authToken, newPhoto); } catch { /* silent */ }
        }
      } else {
        const photo = reader.result as string;
        setMotivationPhoto(photo);
        await persistProfilePatch({ motivationPhoto: photo });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    const parsedWeight = Number(editData.weight) || profile.weight;
    const parsedHeight = Number(editData.height) || profile.height;
    updateProfile({ weight: parsedWeight, height: parsedHeight });
    await persistProfilePatch({ weight: parsedWeight, height: parsedHeight, theme, motivationPhrase, motivationPhoto }, true);
    showToast({
      type: 'success',
      title: authToken ? 'Cambios guardados ✅' : 'Guardado localmente 💾',
      message: authToken ? undefined : 'Inicia sesión para sincronizar.',
    });
    setIsEditing(false);
  };

  const handleThemeChange = async (nextTheme: 'aguamarina-negro' | 'verde-negro' | 'ocaso-negro') => {
    setTheme(nextTheme);
    await persistProfilePatch({ theme: nextTheme });
  };

  const statBars = [
    { label: 'Fuerza', emoji: '💪', value: strengthScore },
    { label: 'Consistencia', emoji: '🔥', value: consistencyScore },
    { label: 'Energía', emoji: '⚡', value: energyScore },
  ];

  return (
    <div className="min-h-screen app-shell px-4 sm:px-6 safe-top safe-bottom">
      <div className="page-wrap max-w-2xl mx-auto pb-12">

        {/* Navigation / iOS Large Title Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 mt-2 flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-gray-400 font-semibold">
              Configuración & Biometría
            </p>
            <h1 className="text-3xl font-black tracking-tight text-white headline-gradient">
              Perfil
            </h1>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
            className={`tap-target px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
              isEditing
                ? 'bg-[var(--app-accent)] text-black border-[var(--app-accent)] shadow-[0_0_12px_var(--app-accent-dim)]'
                : 'bg-white/5 text-gray-200 border-white/10 hover:bg-white/10'
            }`}
          >
            {isEditing ? (
              <>
                <Check size={14} className="stroke-[3]" />
                <span>Listo</span>
              </>
            ) : (
              <>
                <Edit2 size={13} />
                <span>Editar</span>
              </>
            )}
          </motion.button>
        </motion.header>

        {/* ═══ iOS Grouped Settings Layout ═══ */}
        <div className="space-y-6">

          {/* ── SECTION 1: TARJETA DE IDENTIDAD & RANGO ── */}
          <section className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-gray-400 font-semibold px-2">
              Identidad
            </div>

            <motion.div {...mobileCardEntrance(0)} className="glass-panel border border-white/10 rounded-3xl p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center gap-4">
                {/* Avatar with camera action */}
                <div className="relative shrink-0">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 border border-white/15 p-0.5 overflow-hidden shadow-md">
                    <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center overflow-hidden">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Perfil" className="w-full h-full object-cover" />
                      ) : (
                        <User className="app-accent" size={32} />
                      )}
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Cambiar foto de perfil"
                    className="tap-target absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--app-accent)] p-0 rounded-full text-black flex items-center justify-center shadow-lg"
                  >
                    <Camera size={13} className="stroke-[2.5]" />
                  </motion.button>
                  <input type="file" ref={fileInputRef} onChange={(e) => handlePhotoUpload(e, 'profile')} accept="image/*" className="hidden" />
                </div>

                {/* Profile info */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-extrabold text-white truncate">
                    {profile.name || 'Usuario Volt'}
                  </h2>
                  <p className="text-xs text-[var(--app-accent)] font-mono font-medium truncate mt-0.5">
                    {profile.goal}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {profile.gender} · {profile.age} años
                  </p>
                </div>
              </div>

              {/* Rank Row / iOS Cell Style */}
              <div className="mt-4 pt-3.5 border-t border-white/10">
                <motion.button
                  type="button"
                  onClick={() => setShowRankModal(true)}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl ${rankInfo.bg} ${rankInfo.border} border`}>
                      <Shield className="app-accent" size={18} />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Rango Actual</p>
                      <p className={`text-xs font-bold ${rankInfo.color} truncate`}>
                        {rankInfo.emoji} {rankInfo.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <span className="text-xs font-mono font-bold text-white">{consistencyScore}%</span>
                    <ChevronRight size={16} />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </section>

          {/* ── SECTION 2: BIOMETRÍA & INDICADORES ── */}
          <section className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-gray-400 font-semibold px-2">
              Biometría & Rendimiento
            </div>

            {/* Metrics Inset Grouped Table */}
            <motion.div {...mobileCardEntrance(1)} className="glass-panel border border-white/10 rounded-3xl overflow-hidden shadow-lg divide-y divide-white/5">
              {[
                { icon: Scale, label: 'Peso Corporal', value: `${profile.weight} kg`, editKey: 'weight' as const, unit: 'kg' },
                { icon: Ruler, label: 'Estatura', value: `${profile.height} cm`, editKey: 'height' as const, unit: 'cm' },
                { icon: Activity, label: 'Estado Físico', value: profile.currentState.split(' ')[0] },
                { icon: Clock, label: 'Edad', value: `${profile.age} años` },
              ].map((param) => (
                <div key={param.label} className="flex items-center justify-between p-4 px-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                      <param.icon size={16} className="app-accent" />
                    </div>
                    <span className="text-xs font-medium text-gray-200">{param.label}</span>
                  </div>

                  <div>
                    {isEditing && param.editKey ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={editData[param.editKey]}
                          onChange={(e) => setEditData({ ...editData, [param.editKey!]: e.target.value })}
                          className="w-20 bg-black/60 border border-white/20 rounded-xl px-2.5 py-1 text-xs font-bold text-white font-mono text-right focus:border-[var(--app-accent)] outline-none"
                        />
                        <span className="text-xs text-gray-400 font-mono">{param.unit}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-white font-mono">{param.value}</span>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Performance Bars */}
            <motion.div {...mobileCardEntrance(2)} className="glass-panel border border-white/10 rounded-3xl p-5 shadow-lg space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles size={14} className="app-accent" />
                  Score de Rendimiento
                </span>
                <span className="text-[10px] font-mono text-gray-400">Algoritmo Volt</span>
              </div>

              <div className="space-y-3 pt-1">
                {statBars.map((stat, idx) => (
                  <div key={stat.label}>
                    <div className="flex justify-between mb-1.5 text-xs">
                      <span className="text-gray-300 font-medium">{stat.emoji} {stat.label}</span>
                      <span className="font-bold text-white font-mono text-[11px]">{stat.value}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden border border-white/5">
                      <motion.div
                        className="h-full rounded-full bg-[var(--app-accent)] shadow-[0_0_8px_var(--app-accent-dim)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.value}%` }}
                        transition={{ duration: 0.9, ease: [0.34, 1.1, 0.64, 1], delay: 0.15 + idx * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* ── SECTION 3: SEGUIMIENTO DE PESO ── */}
          <section className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-gray-400 font-semibold px-2">
              Seguimiento de Peso
            </div>

            <motion.div {...mobileCardEntrance(3)} className="glass-panel border border-white/10 rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="app-accent" size={18} />
                  <div>
                    <h3 className="text-sm font-bold text-white">Evolución Semanal</h3>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {alreadyLoggedThisWeek
                        ? `✅ Registrado: ${lastWeightLog?.weight} kg esta semana`
                        : 'Registra tu peso semanal para el cálculo de déficit'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Weight input group */}
              <div className="flex gap-2">
                <input
                  type="number"
                  min={20}
                  max={400}
                  step={0.1}
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder={`Ej. ${profile.weight}`}
                  className="input-field min-h-[48px] px-3.5 rounded-2xl bg-black/40 border-white/10 text-sm font-mono flex-1"
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => void handleLogWeight()}
                  disabled={!weightInput || alreadyLoggedThisWeek}
                  className="tap-target pressable primary-btn px-5 rounded-2xl font-bold text-xs disabled:opacity-30 whitespace-nowrap min-h-[48px]"
                >
                  Registrar
                </motion.button>
              </div>

              {/* Weight Chart */}
              {weightChartData.some((d) => d.peso !== null) ? (
                <div className="h-32 w-full p-2 rounded-2xl bg-black/30 border border-white/5">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightChartData}>
                      <XAxis dataKey="week" stroke="#6b7280" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15,15,20,0.92)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#fff',
                        }}
                        itemStyle={{ color: 'var(--app-accent)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="peso"
                        stroke="var(--app-accent)"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: 'var(--app-accent)', strokeWidth: 0 }}
                        connectNulls
                        activeDot={{ r: 5, fill: 'var(--app-accent)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 text-center py-4 font-mono">
                  Sin registros previos. Comienza anotando tu peso de hoy.
                </p>
              )}

              {/* Log History Strip */}
              {weightLogs.length > 0 && (
                <div className="space-y-1.5 max-h-28 overflow-y-auto scrollbar-thin pt-1">
                  <AnimatePresence initial={false}>
                    {[...weightLogs].reverse().slice(0, 4).map((l, idx) => (
                      <motion.div
                        key={l.date}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-black/25 border border-white/5 text-xs"
                      >
                        <span className="text-gray-400 font-mono text-[11px]">{l.date}</span>
                        <span className="font-bold text-[var(--app-accent)] font-mono">{l.weight} kg</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </section>

          {/* ── SECTION 4: METAS SEMANALES & RÉCORDS ── */}
          <section className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-gray-400 font-semibold px-2">
              Objetivos & Récords
            </div>

            {/* Goals Card */}
            <motion.div {...mobileCardEntrance(4)} className="glass-panel border border-white/10 rounded-3xl p-5 shadow-lg space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="app-accent" size={18} />
                  <h3 className="text-sm font-bold text-white">Metas Semanales</h3>
                </div>
                <span className="text-xs font-bold text-white font-mono">
                  {completedGoals}/{weeklyGoals.length}
                </span>
              </div>

              <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden border border-white/5">
                <motion.div className="neuro-progress-fill" {...progressFill(weeklyGoalProgress)} />
              </div>

              <div className="space-y-2 pt-1">
                {weeklyGoals.map((goal, idx) => (
                  <motion.button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleWeeklyGoal(goal.id)}
                    {...mobileCardEntrance(idx)}
                    whileTap={{ scale: 0.98 }}
                    className={`tap-target w-full rounded-2xl border px-3.5 py-3 text-left text-xs font-medium transition-all flex items-center justify-between ${
                      goal.done
                        ? 'border-[var(--app-accent)]/30 bg-[color:var(--app-accent)]/8 text-white'
                        : 'border-white/10 bg-white/[0.02] text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                        goal.done ? 'bg-[var(--app-accent)] border-[var(--app-accent)] text-black' : 'border-white/20 bg-black/30'
                      }`}>
                        {goal.done && <Check size={12} className="stroke-[3]" />}
                      </span>
                      <span>{goal.label}</span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* PRs */}
            {personalRecordsList.length > 0 && (
              <motion.div {...mobileCardEntrance(5)} className="glass-panel border border-white/10 rounded-3xl p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="app-accent" />
                  <h3 className="text-sm font-bold text-white">Récords Personales (PRs)</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {personalRecordsList.map((pr, i) => (
                    <motion.div
                      key={pr.name + i}
                      className="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5"
                    >
                      <div className="min-w-0 mr-2">
                        <p className="text-xs font-semibold text-white truncate">{pr.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{pr.date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold app-accent font-mono">{pr.weight} kg</p>
                        <p className="text-[10px] text-gray-400">× {pr.reps} reps</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Photos Gallery */}
            <motion.div {...mobileCardEntrance(6)} className="glass-panel border border-white/10 rounded-3xl p-5 shadow-lg space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Camera className="app-accent" size={18} />
                  <h3 className="text-sm font-bold text-white">Galería de Progreso</h3>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => progressInputRef.current?.click()}
                  className="tap-target px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-200 hover:text-white flex items-center gap-1"
                >
                  <Plus size={14} />
                  <span>Añadir</span>
                </motion.button>
                <input type="file" ref={progressInputRef} onChange={(e) => handlePhotoUpload(e, 'progress')} accept="image/*" className="hidden" />
              </div>

              {progressPhotos.length > 0 ? (
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                  {progressPhotos.map((photo, i) => (
                    <motion.div
                      key={i}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setActivePhoto(photo.url)}
                      className="cursor-pointer min-w-[96px] h-[128px] rounded-2xl overflow-hidden border border-white/10 relative shrink-0 shadow-md group"
                    >
                      <img src={photo.url} alt="Progreso" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5 text-center text-[9px] font-mono text-gray-300">
                        {new Date(photo.date).toLocaleDateString()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs text-center py-4 font-mono">
                  Sube fotografías de control para registrar tus cambios visuales.
                </p>
              )}
            </motion.div>
          </section>

          {/* ── SECTION 5: PREFERENCIAS & SISTEMA ── */}
          <section className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-gray-400 font-semibold px-2">
              Preferencias de App
            </div>

            <div className="glass-panel border border-white/10 rounded-3xl overflow-hidden shadow-lg divide-y divide-white/5">
              {/* Notificaciones iOS Switch */}
              <div className="flex items-center justify-between p-4 px-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                    <Bell size={16} className="app-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Notificaciones</p>
                    <p className="text-[10px] text-gray-400">Recordatorios de comida y entreno</p>
                  </div>
                </div>

                {'Notification' in window ? (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    aria-pressed={notificationsEnabled}
                    onClick={async () => {
                      if (!notificationsEnabled) {
                        const granted = await notificationService.requestPermission();
                        if (granted) setNotificationsEnabled(true);
                        else showToast({ type: 'error', title: 'Permiso denegado' });
                      } else {
                        setNotificationsEnabled(false);
                        notificationService.clearAll();
                      }
                    }}
                    className={`tap-target relative w-12 h-7 rounded-full p-0.5 transition-colors ${
                      notificationsEnabled ? 'bg-[var(--app-accent)]' : 'bg-gray-700'
                    }`}
                  >
                    <motion.span
                      animate={{ x: notificationsEnabled ? 20 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="block w-6 h-6 rounded-full bg-white shadow-md"
                    />
                  </motion.button>
                ) : (
                  <span className="text-[10px] text-gray-500 font-mono">No soportado</span>
                )}
              </div>

              {/* Tema Visual */}
              <div className="p-4 px-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                    <Palette size={16} className="app-accent" />
                  </div>
                  <span className="text-xs font-semibold text-white">Paleta del Sistema</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { id: 'aguamarina-negro', label: 'Aguamarina', color: '#3ff5d0' },
                    { id: 'verde-negro', label: 'Neón Verde', color: '#39ff14' },
                    { id: 'ocaso-negro', label: 'Ocaso', color: '#ff8a3d' },
                  ].map((option) => (
                    <motion.button
                      key={option.id}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleThemeChange(option.id as 'aguamarina-negro' | 'verde-negro' | 'ocaso-negro')}
                      className={`min-h-[44px] px-3 py-2 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        theme === option.id
                          ? 'border-[var(--app-accent)] bg-[color:var(--app-accent)]/15 text-white shadow-[0_0_12px_var(--app-accent-dim)]'
                          : 'border-white/10 bg-black/30 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: option.color }} />
                      <span>{option.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Disponibilidad */}
              <div className="flex items-center justify-between p-4 px-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                    <Calendar size={16} className="app-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Disponibilidad</p>
                    <p className="text-[10px] text-gray-400 font-mono">{profile.schedule}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-500" />
              </div>
            </div>
          </section>

          {/* ── SECTION 6: MOTIVACIÓN PERSONAL ── */}
          <section className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-gray-400 font-semibold px-2">
              Motivación
            </div>

            <motion.div {...mobileCardEntrance(7)} className="glass-panel border border-white/10 rounded-3xl p-5 shadow-lg space-y-3">
              <div className="flex items-center gap-2">
                <Quote className="app-accent" size={16} />
                <h3 className="text-xs font-bold text-white">Frase de Guerra</h3>
              </div>

              <input
                type="text"
                value={motivationPhrase}
                onChange={(e) => setMotivationPhrase(e.target.value)}
                onBlur={() => void persistProfilePatch({ motivationPhrase })}
                className="input-field min-h-[48px] px-3.5 rounded-2xl bg-black/40 border-white/10 text-xs"
                placeholder="Escribe tu frase motivadora..."
              />

              <div className="pt-1">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => motivationInputRef.current?.click()}
                  className="tap-target w-full py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Camera size={14} />
                  <span>Subir foto de inspiración</span>
                </motion.button>
                <input type="file" ref={motivationInputRef} onChange={(e) => handlePhotoUpload(e, 'motivation')} accept="image/*" className="hidden" />
              </div>

              {motivationPhoto && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl overflow-hidden border border-white/10 relative shadow-md"
                >
                  <img src={motivationPhoto} alt="Motivación" className="w-full h-36 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3.5">
                    <p className="text-xs text-white font-medium italic">"{motivationPhrase}"</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </section>

          {/* ── SECTION 7: SESIÓN / LOGOUT ── */}
          <section className="pt-2">
            <motion.button
              {...mobileCardEntrance(8)}
              type="button"
              onClick={logout}
              whileTap={{ scale: 0.98 }}
              className="tap-target w-full min-h-[52px] rounded-3xl bg-rose-500/10 border border-rose-500/25 text-rose-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all shadow-md"
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </motion.button>
          </section>

        </div>
      </div>

      {/* ═══ RANK DETAIL MODAL (iOS Sheet Style) ═══ */}
      <AnimatePresence>
        {showRankModal && (
          <motion.div
            {...backdropFade}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              {...modalReveal}
              className="bg-[#121217] border border-white/15 p-6 rounded-3xl max-w-sm w-full relative shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center gap-2 mb-1">
                <Shield size={20} className="app-accent" />
                <h3 className="text-lg font-extrabold text-white">Rangos de Condición</h3>
              </div>
              <p className="text-[11px] text-gray-400 mb-5 font-mono">
                Se calcula dinámicamente según el cumplimiento de tus metas semanales.
              </p>

              <div className="space-y-2.5">
                {[
                  { name: 'Recluta de Bronce', emoji: '🛡️', range: '< 30%', min: 0, max: 30 },
                  { name: 'Guerrero de Acero', emoji: '⚔️', range: '30-59%', min: 30, max: 60 },
                  { name: 'Campeón del Neón', emoji: '⚡', range: '60-84%', min: 60, max: 85 },
                  { name: 'Cyborg Supremo', emoji: '🤖', range: '≥ 85%', min: 85, max: 101 },
                ].map((item, idx) => {
                  const isCurrent = consistencyScore >= item.min && consistencyScore < item.max;
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + idx * 0.05, duration: 0.25 }}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'border-[var(--app-accent)] bg-[color:var(--app-accent)]/12 text-white shadow-[0_0_12px_var(--app-accent-dim)]'
                          : 'border-white/5 bg-white/[0.02] text-gray-400'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold">{item.emoji} {item.name}</span>
                        <span className="font-mono text-[10px] text-[var(--app-accent)] font-semibold">{item.range}</span>
                      </div>
                      {isCurrent && (
                        <div className="h-0.5 bg-[var(--app-accent)] rounded-full mt-2 opacity-70" />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowRankModal(false)}
                className="tap-target mt-5 w-full min-h-[48px] rounded-2xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-colors border border-white/10"
              >
                Cerrar
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PHOTO LIGHTBOX ═══ */}
      <AnimatePresence>
        {activePhoto && (
          <motion.div
            {...backdropFade}
            onClick={() => setActivePhoto(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              {...lightboxZoom}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl max-h-[82vh] rounded-3xl overflow-hidden border border-white/20 bg-black shadow-2xl"
            >
              <img src={activePhoto} alt="Progreso ampliado" className="max-w-full max-h-[78vh] object-contain block mx-auto" />
              <motion.button
                type="button"
                aria-label="Cerrar foto"
                whileTap={{ scale: 0.88 }}
                onClick={() => setActivePhoto(null)}
                className="tap-target absolute top-3 right-3 w-10 h-10 bg-black/70 text-white rounded-full flex items-center justify-center hover:text-[var(--app-accent)] transition-colors border border-white/20"
              >
                <X size={18} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

