import { Dumbbell, Calendar, User, Utensils, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { iosSpring } from '../lib/motion';

type TabId = 'home' | 'workout' | 'diet' | 'calendar' | 'profile';

type NavItem = {
  id: TabId;
  icon: typeof Dumbbell;
  label: string;
};

export default function BottomNav() {
  const { currentTab, setTab } = useAppStore();

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(8);
      } catch {
        /* silent fallback for iOS */
      }
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
    <div className="fixed left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[520px] bottom-[calc(0.85rem+env(safe-area-inset-bottom,0px))] lg:hidden select-none">
      <nav
        aria-label="Navegación principal"
        className="ios-pill-nav rounded-full p-2"
      >
        <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] gap-1.5 items-center">
          {/* Primeros 2 tabs (Rutina, Dieta) */}
          {navItems.slice(0, 2).map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setTab(item.id);
                }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'relative tap-target h-12 rounded-full flex flex-col items-center justify-center transition-all overflow-hidden',
                  isActive ? 'text-[var(--app-accent)] font-bold' : 'text-gray-400 hover:text-gray-200'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="pill-active-indicator"
                    transition={iosSpring}
                    className="absolute inset-0 rounded-full bg-[color:var(--app-accent)]/15 border border-[color:var(--app-accent)]/30 -z-10 shadow-[0_0_12px_color-mix(in_srgb,var(--app-accent)_20%,transparent)]"
                  />
                )}
                <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} className="relative z-10" />
                <span className="text-[10px] mt-0.5 tracking-tight relative z-10">{item.label}</span>
              </button>
            );
          })}

          {/* Botón Central: VoltBody (Home) */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              triggerHaptic();
              setTab('home');
            }}
            aria-label="Inicio VoltBody"
            aria-current={isHomeActive ? 'page' : undefined}
            className={clsx(
              'relative tap-target px-3.5 h-12 rounded-full flex items-center justify-center gap-1.5 transition-all',
              isHomeActive
                ? 'bg-[color:var(--app-accent)] text-black font-black shadow-[0_0_20px_color-mix(in_srgb,var(--app-accent)_45%,transparent)]'
                : 'bg-white/10 hover:bg-white/15 text-white font-bold border border-white/10'
            )}
          >
            <motion.div
              animate={isHomeActive ? { rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] } : { rotate: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Zap
                size={18}
                fill={isHomeActive ? 'currentColor' : 'none'}
                className={isHomeActive ? 'text-black' : 'text-[var(--app-accent)]'}
              />
            </motion.div>
            <span className="text-xs uppercase tracking-wider">VoltBody</span>
          </motion.button>

          {/* Últimos 2 tabs (Calendario, Perfil) */}
          {navItems.slice(2).map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setTab(item.id);
                }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'relative tap-target h-12 rounded-full flex flex-col items-center justify-center transition-all overflow-hidden',
                  isActive ? 'text-[var(--app-accent)] font-bold' : 'text-gray-400 hover:text-gray-200'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="pill-active-indicator"
                    transition={iosSpring}
                    className="absolute inset-0 rounded-full bg-[color:var(--app-accent)]/15 border border-[color:var(--app-accent)]/30 -z-10 shadow-[0_0_12px_color-mix(in_srgb,var(--app-accent)_20%,transparent)]"
                  />
                )}
                <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} className="relative z-10" />
                <span className="text-[10px] mt-0.5 tracking-tight relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
