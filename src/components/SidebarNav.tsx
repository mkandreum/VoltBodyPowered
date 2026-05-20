import { Dumbbell, Calendar, User, Utensils, Zap, ShieldAlert, Check } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { useMemo } from 'react';

type TabId = 'home' | 'workout' | 'diet' | 'calendar' | 'profile';

type NavItem = {
  id: TabId;
  icon: typeof Dumbbell;
  label: string;
};

export default function SidebarNav() {
  const { currentTab, setTab, profile, logs, currentStreak } = useAppStore();

  const triggerHaptic = () => {
    if (isSecureContext && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
    }
  };

  const navItems: NavItem[] = [
    { id: 'home', icon: Zap, label: 'Inicio' },
    { id: 'workout', icon: Dumbbell, label: 'Rutina' },
    { id: 'diet', icon: Utensils, label: 'Dieta' },
    { id: 'calendar', icon: Calendar, label: 'Calendario' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  // Gamification stats
  const XP_PER_LOG = 12;
  const XP_PER_STREAK_DAY = 8;
  const XP_PER_LEVEL = 250;
  const totalXP = useMemo(() => logs.length * XP_PER_LOG + currentStreak * XP_PER_STREAK_DAY, [logs.length, currentStreak]);
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xpInLevel = totalXP % XP_PER_LEVEL;
  const xpProgress = Math.round((xpInLevel / XP_PER_LEVEL) * 100);

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-[#09090c] to-[#030304] border-r border-[var(--app-border)] z-50 p-6 select-none">
      {/* ── Brand Header ───────────────────────── */}
      <div className="flex items-center gap-3 mb-10 mt-2 px-2">
        <div className="w-10 h-10 rounded-2xl bg-[color:var(--app-accent)]/15 border border-[color:var(--app-accent)]/30 flex items-center justify-center glow-box">
          <Zap className="app-accent w-5 h-5 fill-current" />
        </div>
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-gray-500 font-bold block">VoltBody OS</span>
          <span className="text-xl font-black tracking-wider text-white uppercase">SISTEMA IA</span>
        </div>
      </div>

      {/* ── Profile Segment ───────────────────────── */}
      {profile && (
        <div className="mb-8 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] backdrop-blur-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--app-accent)] flex items-center justify-center font-bold text-sm bg-black/40 text-[var(--app-accent)] uppercase">
              {profile.name.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{profile.name}</p>
              <p className="text-[10px] text-gray-400 font-mono">⚡ NIVEL {level}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-gray-500">
              <span>Progreso de Nivel</span>
              <span>{xpProgress}%</span>
            </div>
            <div className="h-1.5 w-full neuro-progress-track">
              <motion.div
                className="xp-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation Links ───────────────────────── */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerHaptic();
                setTab(item.id);
              }}
              className={clsx(
                'relative w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all overflow-hidden text-left',
                isActive
                  ? 'text-[var(--app-accent)] font-black'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-tab-glow"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute inset-0 bg-[var(--app-accent)]/[0.06] border-l-4 border-[var(--app-accent)] z-0"
                />
              )}
              <item.icon
                size={18}
                className={clsx(
                  'relative z-10 transition-transform duration-200',
                  isActive ? 'scale-110 app-accent' : 'text-gray-500'
                )}
                fill={isActive && item.id === 'home' ? 'currentColor' : 'none'}
              />
              <span className="relative z-10">{item.label}</span>
              {isActive && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] shadow-[0_0_8px_var(--app-accent)] z-10" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Sidebar Footer ───────────────────────── */}
      <div className="pt-4 border-t border-[var(--app-border)] mt-auto">
        <div className="flex items-center gap-2 px-2 text-[10px] text-gray-500 font-mono">
          <Check size={12} className="text-emerald-400" />
          <span>VoltBody OS Sincronizado</span>
        </div>
      </div>
    </aside>
  );
}
