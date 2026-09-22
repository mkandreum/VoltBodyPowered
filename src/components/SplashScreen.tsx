import { motion } from 'motion/react';
import { Zap } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center app-shell z-[100] bg-black/85 backdrop-blur-2xl">
      {/* Ambient background glow */}
      <div className="absolute w-72 h-72 rounded-full bg-[color:var(--app-accent)]/15 blur-[120px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-6 relative z-10"
      >
        {/* iOS Squircle Icon Container */}
        <div className="relative flex items-center justify-center w-24 h-24 rounded-[26px] bg-gradient-to-b from-white/15 to-white/5 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-2xl">
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-[26px] bg-[color:var(--app-accent)]/15 blur-lg pointer-events-none"
          />
          <Zap size={44} className="app-accent drop-shadow-[0_0_16px_var(--app-accent-dim)]" strokeWidth={2.4} />
        </div>

        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
            Volt<span className="headline-gradient">Body</span>
          </h1>
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-gray-400 mt-0.5">
            AI FITNESS SYSTEM
          </p>
        </div>

        {/* Apple style 3-dot breathing activity indicator */}
        <motion.div
          className="flex gap-2 items-center mt-1"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.16, delayChildren: 0.2 } },
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              variants={{
                hidden: { opacity: 0.2, scale: 0.8 },
                visible: {
                  opacity: [0.25, 1, 0.25],
                  scale: [0.8, 1.25, 0.8],
                  transition: { duration: 0.85, repeat: Infinity, ease: 'easeInOut' },
                },
              }}
              className="block w-2 h-2 rounded-full bg-[color:var(--app-accent)] shadow-[0_0_8px_var(--app-accent-dim)]"
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

