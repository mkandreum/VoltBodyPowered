import { Dumbbell, Calendar, User, Utensils, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'motion/react';
import clsx from 'clsx';

export default function BottomNav() {
  const { currentTab, setTab } = useAppStore();

  const navItems = [
    { id: 'workout', icon: Dumbbell, label: 'Rutina' },
    { id: 'diet', icon: Utensils, label: 'Dieta' },
    { id: 'logo', icon: Zap, label: 'VoltBody' },
    { id: 'calendar', icon: Calendar, label: 'Calendario' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ] as const;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-md">
      <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-full p-2 flex justify-between items-center shadow-2xl glow-box">
        {navItems.map((item, index) => {
          const isCenter = index === 2; // Middle item
          const isActive = currentTab === item.id || (isCenter && currentTab === 'home');

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'logo') setTab('home');
                else setTab(item.id as any);
              }}
              className={clsx(
                'relative flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300',
                isActive ? 'text-[#39ff14]' : 'text-gray-400 hover:text-white',
                isCenter ? 'bg-[#39ff14]/10 border border-[#39ff14]/30 w-16 h-16 -mt-6 shadow-[0_0_15px_rgba(57,255,20,0.3)]' : ''
              )}
            >
              {isActive && !isCenter && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-[#39ff14]/20 rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon
                size={isCenter ? 32 : 24}
                className={clsx(
                  'relative z-10 transition-transform duration-300',
                  isActive && 'scale-110 drop-shadow-[0_0_8px_rgba(57,255,20,0.8)]',
                  isCenter && 'text-[#39ff14]'
                )}
              />
              {isCenter && (
                <span className="absolute -bottom-2 text-[9px] font-bold tracking-widest text-[#39ff14] uppercase glow-text whitespace-nowrap">
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
