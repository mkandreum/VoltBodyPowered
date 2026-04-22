import { motion } from 'motion/react';
import { Zap } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center app-shell z-[100]">
      <motion.div
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-5"
      >
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl border border-[color:var(--app-accent)]/30 shadow-[0_0_32px_color-mix(in_srgb,var(--app-accent)_28%,transparent)]">
          <Zap size={36} className="text-[color:var(--app-accent)]" strokeWidth={2.5} />
        </div>

        <p className="font-display text-2xl font-black tracking-widest uppercase text-white/90">
          VoltBody
        </p>

        <motion.div
          className="flex gap-1.5"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.18, delayChildren: 0.3 } },
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              variants={{
                hidden: { opacity: 0.2, y: 0 },
                visible: {
                  opacity: [0.2, 1, 0.2],
                  y: [0, -5, 0],
                  transition: { duration: 0.72, repeat: Infinity, ease: 'easeInOut' },
                },
              }}
              className="block w-1.5 h-1.5 rounded-full bg-[color:var(--app-accent)]"
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
