import { Dumbbell, Calendar, User, Utensils, Home } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { iosSpring } from '../lib/motion';

type TabId = 'home' | 'workout' | 'diet' | 'calendar' | 'profile';

type NavItem = {
  id: TabId;
  icon: typeof Home;
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
    { id: 'home', icon: Home, label: 'Inicio' },
    { id: 'workout', icon: Dumbbell, label: 'Rutina' },
    { id: 'diet', icon: Utensils, label: 'Dieta' },
    { id: 'calendar', icon: Calendar, label: 'Calendario' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="ios-tab-bar lg:hidden"
    >
      <div className="grid grid-cols-5 h-[52px] max-w-[560px] mx-auto px-1 items-center">
        {navItems.map((item) => {
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
                'relative tap-target flex flex-col items-center justify-center w-full h-full py-1 text-center transition-colors',
                isActive ? 'text-[var(--app-accent)]' : 'text-[#8e8e93] hover:text-[#d1d1d6]'
              )}
            >
              {/* Active subtle pill background indicator */}
              {isActive && (
                <motion.div
                  layoutId="active-tab-indicator"
                  transition={iosSpring}
                  className="absolute inset-x-2 inset-y-1 rounded-xl bg-[color:var(--app-accent)]/10 -z-10"
                />
              )}

              <motion.div
                animate={{ scale: isActive ? 1.08 : 1, y: isActive ? -1 : 0 }}
                transition={iosSpring}
                className="flex items-center justify-center"
              >
                <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
              </motion.div>

              <span
                className={clsx(
                  'nav-label mt-1 transition-colors',
                  isActive ? 'text-[var(--app-accent)] font-semibold' : 'text-[#8e8e93] font-medium'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
