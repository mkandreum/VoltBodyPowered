import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { authService } from '../services/authService';
import { workoutService } from '../services/workoutService';
import { User, LogOut, Activity, Target, Clock, Scale, Ruler, Camera, Plus, Edit2, Check, Palette, Quote, TrendingUp, Trophy, Bell, X, Shield } from 'lucide-react';
import { listStagger, checkBounce, numberRoll, mobileCardEntrance, modalReveal, lightboxZoom, backdropFade, elasticPop, progressFill, mobileTap } from '../lib/motion';
import { format, subWeeks, startOfWeek } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { notificationService } from '../services/notificationService';
import { AppCard, SectionHeader } from '../components/ui';

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
  } = useAppStore();

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
      { min: 0, max: 30, name: 'Recluta de Bronce', emoji: '🛡️', desc: 'Estás comenzando tu camino de acero.', color: 'text-amber-600', bg: 'bg-amber-500/5', border: 'border-amber-500/15' },
      { min: 30, max: 60, name: 'Guerrero de Acero', emoji: '⚔️', desc: 'Has forjado las bases de tu consistencia.', color: 'text-slate-300', bg: 'bg-slate-300/5', border: 'border-slate-300/15' },
      { min: 60, max: 85, name: 'Campeón del Neón', emoji: '⚡', desc: '¡Increíble! Brillas en cada entreno.', color: 'text-cyan-400 glow-text', bg: 'bg-cyan-500/5', border: 'border-cyan-400/20' },
      { min: 85, max: 101, name: 'Cyborg Supremo', emoji: '🤖', desc: 'Eres una máquina imparable.', color: 'text-[color:var(--app-accent)] glow-text', bg: 'bg-[color:var(--app-accent)]/5', border: 'border-[color:var(--app-accent)]/20' },
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
    { label: '💪 Fuerza', value: strengthScore },
    { label: '🔥 Consistencia', value: consistencyScore },
    { label: '⚡ Energía', value: energyScore },
  ];

  return (
    <div className="min-h-screen app-shell px-4 safe-top md:px-6 safe-bottom">
      <div className="page-wrap">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 mt-2 flex justify-between items-center"
        >
          <h1 className="brutal-title text-white flex items-center gap-3">
            <User className="app-accent" size={28} />
            <span className="headline-gradient">Perfil</span>
          </h1>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9, rotate: isEditing ? 0 : 90 }}
            onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
            className="tap-target pressable p-2.5 neuro-raised rounded-full hover:text-[var(--app-accent)] transition-colors"
          >
            {isEditing ? <Check className="app-accent" size={20} /> : <Edit2 className="text-gray-400" size={18} />}
          </motion.button>
        </motion.header>

        {/* Bento Grid */}
        <div className="flex flex-col lg:grid lg:grid-cols-[380px_1fr] lg:gap-8 lg:items-start pb-8">

          {/* ═══ LEFT COLUMN (Sticky on desktop) ═══ */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-24 w-full lg:max-w-[380px]">

            {/* Avatar Card */}
            <motion.div {...mobileCardEntrance(0)}>
              <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-5 flex items-center gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-[color:var(--app-accent)]/8 rounded-full blur-3xl -mr-12 -mt-12" />

                <div className="relative">
                  <div className="w-20 h-20 rounded-full avatar-ring-animated p-[3px]">
                    <div className="w-full h-full bg-black rounded-full flex items-center justify-center border-2 border-[#0a0a0a] overflow-hidden">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="app-accent" size={32} />
                      )}
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="tap-target pressable absolute -bottom-1 -right-1 bg-[var(--app-accent)] p-1.5 rounded-full text-black"
                  >
                    <Camera size={12} />
                  </motion.button>
                  <input type="file" ref={fileInputRef} onChange={(e) => handlePhotoUpload(e, 'profile')} accept="image/*" className="hidden" />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold mb-0.5 headline-gradient truncate">{profile.name || 'Usuario Volt'}</h2>
                  <p className="app-accent font-mono text-xs glow-text truncate">{profile.goal}</p>
                </div>
              </div>
            </motion.div>

            {/* Rank Badge */}
            <motion.div {...mobileCardEntrance(1)}>
              <motion.button
                type="button"
                onClick={() => setShowRankModal(true)}
                whileTap={{ scale: 0.97 }}
                className="w-full text-left focus:outline-none"
              >
                <div className={`glass-panel rounded-2xl p-4 border ${rankInfo.border} ${rankInfo.bg} relative overflow-hidden rank-badge-shimmer`}>
                  <div className="flex items-center gap-3.5 relative z-10">
                    <motion.div
                      animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className="p-2.5 rounded-xl bg-black/40 border border-gray-800/50 flex items-center justify-center shrink-0"
                    >
                      <Shield className="app-accent" size={22} />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-mono">Rango Volt</p>
                      <h4 className={`text-sm font-black ${rankInfo.color}`}>{rankInfo.emoji} {rankInfo.name}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Consistencia: <span className="font-mono text-white font-bold">{consistencyScore}%</span></p>
                    </div>
                  </div>
                </div>
              </motion.button>
            </motion.div>

            {/* Body Parameters */}
            <motion.div {...mobileCardEntrance(2)} className="grid grid-cols-2 gap-2.5">
              {[
                { icon: Scale, label: 'Peso', value: `${profile.weight} kg`, editKey: 'weight' as const },
                { icon: Ruler, label: 'Altura', value: `${profile.height} cm`, editKey: 'height' as const },
                { icon: Activity, label: 'Nivel', value: profile.currentState.split(' ')[0] },
                { icon: Clock, label: 'Edad', value: `${profile.age} años` },
              ].map((param) => (
                <motion.div
                  key={param.label}
                  whileTap={{ scale: 0.96 }}
                  className="neuro-raised rounded-2xl p-3.5 flex items-center gap-2.5"
                >
                  <param.icon className="app-accent shrink-0" size={18} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">{param.label}</p>
                    {isEditing && param.editKey ? (
                      <input
                        type="number"
                        value={editData[param.editKey]}
                        onChange={(e) => setEditData({ ...editData, [param.editKey!]: e.target.value })}
                        className="w-full bg-black/50 border border-gray-700/40 rounded-lg px-1.5 py-0.5 text-xs font-bold text-white font-mono"
                      />
                    ) : (
                      <p className="text-sm font-bold text-white capitalize truncate">{param.value}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Fitness Indicators */}
            <motion.div {...mobileCardEntrance(3)} className="glass-panel border border-[var(--app-border)] rounded-2xl p-5">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-4 flex items-center gap-2 font-mono">
                <Activity className="app-accent" size={14} />
                Indicadores de forma
              </h3>
              <div className="space-y-3">
                {statBars.map((stat, idx) => (
                  <div key={stat.label}>
                    <div className="flex justify-between mb-1 text-xs">
                      <span className="text-gray-400">{stat.label}</span>
                      <motion.span
                        key={stat.value}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-bold text-white font-mono text-[11px]"
                      >
                        {stat.value}%
                      </motion.span>
                    </div>
                    <div className="stat-bar-track">
                      <motion.div
                        className="stat-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.value}%` }}
                        transition={{ duration: 1, ease: [0.34, 1.1, 0.64, 1], delay: 0.2 + idx * 0.15 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Notifications */}
            <motion.div {...mobileCardEntrance(4)} className="glass-panel border border-[var(--app-border)] rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="app-accent" size={16} />
                  <div>
                    <p className="text-xs text-white font-medium">Recordatorios</p>
                    <p className="text-[9px] text-gray-500 font-mono">Comidas · Entrenos · Racha</p>
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
                    className={`relative w-11 h-6 rounded-full transition-colors ${notificationsEnabled ? 'bg-[var(--app-accent)]' : 'bg-gray-700'}`}
                  >
                    <motion.span
                      animate={{ x: notificationsEnabled ? 20 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-md"
                    />
                  </motion.button>
                ) : (
                  <span className="text-[9px] text-gray-600">No soportado</span>
                )}
              </div>
            </motion.div>

            {/* Logout */}
            <motion.button
              {...mobileCardEntrance(5)}
              type="button"
              onClick={logout}
              whileTap={{ scale: 0.96 }}
              className="tap-target w-full danger-btn font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm"
            >
              <LogOut size={16} />
              Cerrar Sesión
            </motion.button>
          </div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <div className="flex flex-col gap-5 w-full mt-5 lg:mt-0">

            {/* Weight Tracking */}
            <motion.div {...mobileCardEntrance(0)} className="glass-panel border border-[var(--app-border)] rounded-2xl p-5">
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <TrendingUp className="app-accent" size={18} />
                ⚖️ Peso Semanal
              </h3>
              <p className="text-[10px] text-gray-500 mb-4 font-mono">
                {alreadyLoggedThisWeek
                  ? `✅ Registraste ${lastWeightLog?.weight} kg esta semana`
                  : 'Registra tu peso una vez por semana'}
              </p>

              <div className="flex gap-2.5 mb-5">
                <input
                  type="number"
                  min={20} max={400} step={0.1}
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder={`Ej. ${profile.weight}`}
                  className="input-field flex-1"
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => void handleLogWeight()}
                  disabled={!weightInput || alreadyLoggedThisWeek}
                  className="tap-target pressable primary-btn px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-30 whitespace-nowrap"
                >
                  Guardar
                </motion.button>
              </div>

              {weightChartData.some((d) => d.peso !== null) ? (
                <div className="h-28 w-full neuro-inset p-2 rounded-xl bg-black/30">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightChartData}>
                      <XAxis dataKey="week" stroke="#6b7280" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--neuro-surface)', border: '1px solid var(--app-border)', borderRadius: '10px', fontSize: '11px' }}
                        itemStyle={{ color: 'var(--app-accent)' }}
                      />
                      <Line type="monotone" dataKey="peso" stroke="var(--app-accent)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--app-accent)', strokeWidth: 0 }} connectNulls activeDot={{ r: 4, fill: 'var(--app-accent)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-[10px] text-gray-600 text-center py-3 font-mono">Sin datos aún. ¡Empieza a registrar!</p>
              )}

              {weightLogs.length > 0 && (
                <div className="mt-3 space-y-1 max-h-28 overflow-y-auto scrollbar-thin">
                  <AnimatePresence initial={false}>
                    {[...weightLogs].reverse().slice(0, 5).map((l, idx) => (
                      <motion.div
                        key={l.date}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        transition={{ delay: idx * 0.04, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-between neuro-inset px-3 py-1.5 rounded-lg text-[10px]"
                      >
                        <span className="text-gray-500 font-mono">{l.date}</span>
                        <AnimatePresence mode="wait">
                          <motion.span key={l.weight} {...numberRoll} className="font-bold text-[var(--app-accent)] font-mono">
                            {l.weight} kg
                          </motion.span>
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>

            {/* Weekly Goals */}
            <motion.div {...mobileCardEntrance(1)} className="glass-panel border border-[var(--app-border)] rounded-2xl p-5">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Target className="app-accent" size={18} />
                Metas semanales
              </h3>
              <div className="mb-3 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                <span>Progreso</span>
                <span className="font-bold text-white">{completedGoals}/{weeklyGoals.length}</span>
              </div>
              <div className="mb-4 h-2 w-full neuro-progress-track">
                <motion.div className="neuro-progress-fill" {...progressFill(weeklyGoalProgress)} />
              </div>
              <div className="space-y-2">
                {weeklyGoals.map((goal, idx) => (
                  <motion.button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleWeeklyGoal(goal.id)}
                    {...mobileCardEntrance(idx)}
                    whileTap={{ scale: 0.97 }}
                    className={`tap-target w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                      goal.done
                        ? 'border-emerald-400/40 bg-emerald-500/8 text-emerald-300'
                        : 'neuro-raised text-gray-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <AnimatePresence mode="wait" initial={false}>
                        {goal.done ? (
                          <motion.span key="done" {...checkBounce}>✅</motion.span>
                        ) : (
                          <motion.span key="undone" {...checkBounce}>⬜</motion.span>
                        )}
                      </AnimatePresence>
                      <span className="text-xs">{goal.label}</span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* PRs */}
            {personalRecordsList.length > 0 && (
              <motion.div {...mobileCardEntrance(2)} className="neuro-raised rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-white/90 mb-3 flex items-center gap-2">
                  <Trophy size={14} className="app-accent" />
                  🏆 Récords personales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {personalRecordsList.map((pr, i) => (
                    <motion.div
                      key={pr.name + i}
                      {...mobileCardEntrance(i)}
                      className="flex items-center justify-between neuro-inset p-3 rounded-xl"
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="text-xs text-white font-medium truncate">{pr.name}</p>
                        <p className="text-[9px] text-gray-600 font-mono">{pr.date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold app-accent font-mono">{pr.weight}kg</p>
                        <p className="text-[9px] text-gray-500">× {pr.reps}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Progress Photos */}
            <motion.div {...mobileCardEntrance(3)} className="glass-panel border border-[var(--app-border)] rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Camera className="app-accent" size={18} />
                  📸 Progreso
                </h3>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => progressInputRef.current?.click()}
                  className="tap-target pressable p-2 neuro-raised rounded-full text-white hover:text-[var(--app-accent)] transition-colors"
                >
                  <Plus size={14} />
                </motion.button>
                <input type="file" ref={progressInputRef} onChange={(e) => handlePhotoUpload(e, 'progress')} accept="image/*" className="hidden" />
              </div>

              {progressPhotos.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
                  {progressPhotos.map((photo, i) => (
                    <motion.div
                      key={i}
                      {...mobileCardEntrance(i)}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActivePhoto(photo.url)}
                      className="cursor-pointer min-w-[100px] h-[135px] rounded-xl overflow-hidden neuro-raised relative shrink-0"
                    >
                      <img src={photo.url} alt="Progreso" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-center text-[8px] font-mono text-gray-300">
                        {new Date(photo.date).toLocaleDateString()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-xs text-center py-4 font-mono">Sube fotos para ver tu evolución.</p>
              )}
            </motion.div>

            {/* Theme Selector */}
            <motion.div {...mobileCardEntrance(4)} className="panel-soft rounded-2xl p-5">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Palette className="app-accent" size={18} />
                Tema Visual
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'aguamarina-negro', label: '🌊 Agua', color: '#3ff5d0' },
                  { id: 'verde-negro', label: '💚 Verde', color: '#39ff14' },
                  { id: 'ocaso-negro', label: '🌅 Ocaso', color: '#ff8a3d' },
                ].map((option) => (
                  <motion.button
                    key={option.id}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleThemeChange(option.id as 'aguamarina-negro' | 'verde-negro' | 'ocaso-negro')}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      theme === option.id
                        ? 'border-[color:var(--app-accent)]/50 bg-[color:var(--app-accent)]/10 text-[var(--app-accent)]'
                        : 'neuro-raised text-gray-400'
                    }`}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Motivation */}
            <motion.div {...mobileCardEntrance(5)} className="glass-panel border border-[var(--app-border)] rounded-2xl p-5">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Quote className="app-accent" size={18} />
                Motivación
              </h3>
              <input
                type="text"
                value={motivationPhrase}
                onChange={(e) => setMotivationPhrase(e.target.value)}
                onBlur={() => void persistProfilePatch({ motivationPhrase })}
                className="input-field mb-3 text-sm"
                placeholder="Tu frase motivacional..."
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => motivationInputRef.current?.click()}
                className="tap-target pressable secondary-btn w-full mb-3 text-white py-2.5 rounded-xl text-sm font-bold"
              >
                Subir foto motivacional 📷
              </motion.button>
              <input type="file" ref={motivationInputRef} onChange={(e) => handlePhotoUpload(e, 'motivation')} accept="image/*" className="hidden" />

              {motivationPhoto && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl overflow-hidden border border-[var(--app-border)] relative"
                >
                  <img src={motivationPhoto} alt="Motivación" className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-3">
                    <p className="text-xs text-white font-medium italic">"{motivationPhrase}"</p>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Availability */}
            <motion.div {...mobileCardEntrance(6)} className="panel-soft rounded-2xl p-5">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Target className="app-accent" size={18} />
                Disponibilidad 📆
              </h3>
              <p className="text-gray-500 font-mono text-xs">{profile.schedule}</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ═══ RANK DETAIL MODAL ═══ */}
      <AnimatePresence>
        {showRankModal && (
          <motion.div
            {...backdropFade}
            className="fixed inset-0 z-50 bg-black/85 modal-backdrop flex items-center justify-center p-4"
          >
            <motion.div
              {...modalReveal}
              className="bg-[var(--app-bg)] border border-[var(--app-border)] p-5 rounded-3xl max-w-sm w-full relative glass-panel"
            >
              <motion.h3
                {...elasticPop}
                className="text-lg font-black text-white mb-1 headline-gradient flex items-center gap-2"
              >
                <Shield size={18} className="app-accent" />
                Rangos de Condición
              </motion.h3>
              <p className="text-[10px] text-gray-500 mb-5 font-mono">Tu rango se calcula según el cumplimiento de metas semanales.</p>

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
                      transition={{ delay: 0.1 + idx * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'border-[color:var(--app-accent)]/40 bg-[color:var(--app-accent)]/8 text-white'
                          : 'border-gray-800/30 bg-gray-900/20 text-gray-500'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold">{item.emoji} {item.name}</span>
                        <span className="font-mono text-[9px] text-[color:var(--app-accent)]">{item.range}</span>
                      </div>
                      {isCurrent && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ delay: 0.4, duration: 0.6, ease: [0.34, 1.1, 0.64, 1] }}
                          className="h-0.5 bg-[var(--app-accent)] rounded-full mt-2 opacity-60"
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowRankModal(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-gray-800/60 text-white text-sm hover:text-[var(--app-accent)] font-bold transition-colors border border-gray-700/30"
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
            className="fixed inset-0 z-50 bg-black/92 modal-backdrop flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              {...lightboxZoom}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl max-h-[82vh] rounded-2xl overflow-hidden lightbox-neon bg-black"
            >
              <img src={activePhoto} alt="Progreso ampliado" className="max-w-full max-h-[78vh] object-contain block mx-auto" />
              <motion.button
                type="button"
                whileTap={{ scale: 0.85 }}
                onClick={() => setActivePhoto(null)}
                className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2 hover:text-[var(--app-accent)] transition-colors border border-gray-700/30"
              >
                <X size={16} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
