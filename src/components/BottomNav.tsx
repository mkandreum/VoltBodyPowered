import { Dumbbell, Calendar, User, Utensils, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

type TabId = 'home' | 'workout' | 'diet' | 'calendar' | 'profile';

type NavItem = {
  id: TabId;
  icon: typeof Dumbbell;
  label: string;
};

export default function BottomNav() {
  const { currentTab, setTab } = useAppStore();
  const smoothTabTransition = { type: 'tween' as const, duration: 0.14, ease: [0.22, 1, 0.36, 1] as const };

  const triggerHaptic = () => {
    if (isSecureContext && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
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
    <div className="fixed left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-[520px] bottom-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="ios-pill-nav border border-[color:var(--neuro-shadow-light)]/50 rounded-full p-2.5">
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
                    transition={smoothTabTransition}
                    className="tab-switch-glow absolute -inset-2"
                  />
                )}
                {isActive && (
                  <motion.span
                    layoutId="nav-liquid-indicator"
                    transition={smoothTabTransition}
                    className="liquid-indicator absolute inset-0"
                  />
                )}
                <item.icon size={16} className={clsx('transition-transform', isActive && 'scale-110')} />
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      key="label-left"
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                      className="nav-label"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
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
              'relative overflow-hidden tap-target px-2 flex-1 max-w-[140px] min-w-[100px] h-12 rounded-full border transition-all text-center',
              currentTab === 'home'
                ? 'border-[color:var(--app-accent)]/55 app-accent shadow-[inset_3px_3px_8px_var(--neuro-shadow-dark),inset_-2px_-2px_6px_var(--neuro-shadow-light),0_0_14px_color-mix(in_srgb,var(--app-accent)_22%,transparent)]'
                : 'border-[color:var(--neuro-shadow-light)]/60 text-gray-300 hover:text-white shadow-[4px_4px_12px_var(--neuro-shadow-dark),-2px_-2px_8px_var(--neuro-shadow-light)]'
            )}
          >
            {currentTab === 'home' && (
              <motion.span
                layoutId="nav-tab-glow"
                transition={smoothTabTransition}
                className="tab-switch-glow absolute -inset-2"
              />
            )}
            {currentTab === 'home' && (
              <motion.span
                layoutId="nav-liquid-indicator"
                transition={smoothTabTransition}
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
                    transition={smoothTabTransition}
                    className="tab-switch-glow absolute -inset-2"
                  />
                )}
                {isActive && (
                  <motion.span
                    layoutId="nav-liquid-indicator"
                    transition={smoothTabTransition}
                    className="liquid-indicator absolute inset-0"
                  />
                )}
                <item.icon size={16} className={clsx('transition-transform', isActive && 'scale-110')} />
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      key="label-right"
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                      className="nav-label"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
