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
    { id: 'workout', icon: Dumbbell, label: 'Rutina' },
    { id: 'diet', icon: Utensils, label: 'Dieta' },
    { id: 'logo', icon: Zap, label: 'VoltBody' },
    { id: 'calendar', icon: Calendar, label: 'Calendario' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ] as const;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-md">
      <div className="glass-panel border border-[var(--app-border)] rounded-full p-2 flex justify-between items-center shadow-2xl glow-box">
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
                'pulse-surface relative flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300',
                isActive ? 'app-accent' : 'text-gray-400 hover:text-white',
                isCenter ? 'bg-[color:var(--app-accent)]/10 border border-[color:var(--app-accent)]/30 w-16 h-16 -mt-6 shadow-[0_0_15px_var(--app-accent-dim)]' : ''
              )}
            >
              {isActive && !isCenter && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-[color:var(--app-accent)]/20 rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
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
                <span className="absolute -bottom-2 text-[9px] font-bold tracking-widest app-accent uppercase glow-text whitespace-nowrap">
                  VoltBody
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
