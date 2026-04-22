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
  const springTransition = { type: 'spring' as const, stiffness: 400, damping: 28 };

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

  const isHomeActive = currentTab === 'home';

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-[520px] bottom-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="ios-pill-nav rounded-full p-2.5">
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
                    transition={springTransition}
                    className="tab-switch-glow absolute -inset-2"
                  />
                )}
                <item.icon size={16} className={clsx('relative z-[1] transition-transform', isActive && 'scale-110')} />
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      key="label-left"
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                      className="nav-label relative z-[1]"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="nav-active-dot"
                    transition={springTransition}
                    className="nav-dot-indicator"
                  />
                )}
              </button>
            );
          })}

          {/* ── Center VoltBody button ───────────────────────── */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              triggerHaptic();
              setTab('home');
            }}
            className={clsx(
              'relative overflow-hidden tap-target px-2 flex-1 max-w-[140px] min-w-[100px] h-12 rounded-full border transition-all text-center',
              isHomeActive
                ? 'border-[color:var(--app-accent)]/40 shadow-[inset_3px_3px_8px_var(--neuro-shadow-dark),inset_-2px_-2px_6px_var(--neuro-shadow-light),0_0_14px_color-mix(in_srgb,var(--app-accent)_22%,transparent)]'
                : 'border-[color:var(--neuro-shadow-light)]/60 hover:border-[color:var(--neuro-shadow-light)]/80 shadow-[4px_4px_12px_var(--neuro-shadow-dark),-2px_-2px_8px_var(--neuro-shadow-light)]'
            )}
          >
            {isHomeActive && (
              <motion.span
                layoutId="nav-tab-glow"
                transition={springTransition}
                className="tab-switch-glow absolute -inset-2"
              />
            )}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-[0.18em] uppercase relative z-[1]">
              <motion.span
                key={isHomeActive ? 'bolt-active' : 'bolt-idle'}
                animate={isHomeActive ? { scale: [1, 1.35, 1], rotate: [0, -10, 8, 0] } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex"
              >
                <Zap
                  size={12}
                  className={clsx(
                    'transition-all duration-200',
                    isHomeActive
                      ? 'text-amber-400 drop-shadow-[0_0_6px_#fbbf24]'
                      : 'text-gray-500'
                  )}
                  fill={isHomeActive ? '#fbbf24' : 'none'}
                />
              </motion.span>
              <span className={clsx(
                'transition-colors duration-200',
                isHomeActive ? 'app-accent' : 'text-gray-400'
              )}>
                VoltBody
              </span>
            </span>
            {isHomeActive && (
              <motion.span
                layoutId="nav-active-dot"
                transition={springTransition}
                className="nav-dot-indicator"
              />
            )}
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
                    transition={springTransition}
                    className="tab-switch-glow absolute -inset-2"
                  />
                )}
                <item.icon size={16} className={clsx('relative z-[1] transition-transform', isActive && 'scale-110')} />
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      key="label-right"
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                      className="nav-label relative z-[1]"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="nav-active-dot"
                    transition={springTransition}
                    className="nav-dot-indicator"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
