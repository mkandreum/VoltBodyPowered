import { Dumbbell, Calendar, User, Utensils, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import clsx from 'clsx';

type TabId = 'home' | 'workout' | 'diet' | 'calendar' | 'profile';

type NavItem = {
  id: TabId;
  icon: typeof Dumbbell;
  label: string;
};

export default function BottomNav() {
  const { currentTab, setTab } = useAppStore();

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
    }
  };

  const navItems: NavItem[] = [
    { id: 'workout', icon: Dumbbell, label: 'Rutina' },
    { id: 'diet', icon: Utensils, label: 'Dieta' },
    { id: 'calendar', icon: Calendar, label: 'Calendario' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-[520px] bottom-[calc(0.65rem+env(safe-area-inset-bottom))]">
      <div className="ios-pill-nav glass-panel border border-[color:var(--app-border)]/70 rounded-full p-2 shadow-2xl">
        <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] gap-2 items-center">
          {navItems.slice(0, 2).map((item) => {
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setTab(item.id);
                }}
                aria-label={item.label}
                className={clsx(
                  'relative overflow-hidden tap-target pressable pulse-surface nav-soft-btn',
                  isActive && 'nav-soft-btn-active'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-tab-glow"
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    className="tab-switch-glow absolute -inset-2"
                  />
                )}
                {isActive && (
                  <motion.span
                    layoutId="nav-liquid-indicator"
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    className="liquid-indicator absolute inset-0"
                  />
                )}
                <item.icon size={18} className={clsx('transition-transform', isActive && 'scale-110')} />
              </button>
            );
          })}

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              triggerHaptic();
              setTab('home');
            }}
            className={clsx(
              'relative overflow-hidden tap-target px-2 min-w-[120px] h-11 rounded-full border transition-all text-center',
              currentTab === 'home'
                ? 'border-[color:var(--app-accent)]/60 bg-[color:var(--app-accent)]/10 app-accent'
                : 'border-[color:var(--app-border)]/80 bg-black/20 text-gray-300 hover:text-white'
            )}
          >
            {currentTab === 'home' && (
              <motion.span
                layoutId="nav-tab-glow"
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="tab-switch-glow absolute -inset-2"
              />
            )}
            {currentTab === 'home' && (
              <motion.span
                layoutId="nav-liquid-indicator"
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="liquid-indicator absolute inset-0"
              />
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-black tracking-[0.18em] uppercase">
              <Zap size={12} />
              VoltBody
            </span>
          </motion.button>

          {navItems.slice(2).map((item) => {
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setTab(item.id);
                }}
                aria-label={item.label}
                className={clsx(
                  'relative overflow-hidden tap-target pressable pulse-surface nav-soft-btn',
                  isActive && 'nav-soft-btn-active'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-tab-glow"
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    className="tab-switch-glow absolute -inset-2"
                  />
                )}
                {isActive && (
                  <motion.span
                    layoutId="nav-liquid-indicator"
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    className="liquid-indicator absolute inset-0"
                  />
                )}
                <item.icon size={18} className={clsx('transition-transform', isActive && 'scale-110')} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
