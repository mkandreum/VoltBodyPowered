import { Dumbbell, Calendar, User, Utensils, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import clsx from 'clsx';

export default function BottomNav() {
  const { currentTab, setTab } = useAppStore();

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
    }
  };

  const navItems = [
    { id: 'workout', icon: Dumbbell, label: '💪 Rutina' },
    { id: 'diet', icon: Utensils, label: '🍽️ Dieta' },
    { id: 'logo', icon: Zap, label: '⚡ VoltBody' },
    { id: 'calendar', icon: Calendar, label: '📅 Calendario' },
    { id: 'profile', icon: User, label: '👤 Perfil' },
  ] as const;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-[460px] bottom-[calc(0.7rem+env(safe-area-inset-bottom))]">
      <div className="glass-panel border border-[var(--app-border)] rounded-[1.4rem] p-2 flex justify-between items-center shadow-2xl">
        {navItems.map((item, index) => {
          const isCenter = index === 2; // Middle item
          const isActive = currentTab === item.id || (isCenter && currentTab === 'home');

          return (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic();
                if (item.id === 'logo') setTab('home');
                else setTab(item.id as any);
              }}
              className={clsx(
                'relative tap-target flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300',
                isCenter ? 'overflow-visible' : 'pulse-surface',
                isActive ? 'app-accent' : 'text-gray-400 hover:text-white',
                isCenter ? 'bg-[color:var(--app-accent)]/10 border border-[color:var(--app-accent)]/30 w-16 h-16 -mt-5 shadow-[0_0_15px_var(--app-accent-dim)] rounded-3xl' : ''
              )}
            >
              {isActive && !isCenter && (
                <motion.div
                  className="absolute inset-0 bg-[color:var(--app-accent)]/16 rounded-2xl"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <item.icon
                size={isCenter ? 32 : 24}
                className={clsx(
                  'relative z-10 transition-transform duration-300',
                  isActive && 'scale-110 drop-shadow-[0_0_8px_var(--app-accent-dim)]',
                  isCenter && 'app-accent'
                )}
              />
              {isCenter && (
                <span className="absolute -bottom-4 text-[9px] font-bold tracking-[0.18em] app-accent uppercase whitespace-nowrap">
                  ⚡ VoltBody
                </span>
              )}
              {!isCenter && isActive && (
                <span className="absolute -bottom-1 text-[9px] font-semibold app-accent whitespace-nowrap tracking-wide">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
