import type { ReactNode } from 'react';

type AppCardProps = {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  accent?: boolean;
};

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function AppCard({ children, className, interactive = false, accent = false }: AppCardProps) {
  return (
    <div
      className={cn(
        'app-card rounded-2xl border p-4 sm:p-6 transition-all backdrop-blur-xl',
        'bg-[linear-gradient(170deg,color-mix(in_srgb,var(--app-surface)_88%,black_12%),color-mix(in_srgb,var(--app-surface-elevated)_88%,black_12%))] border-white/10 shadow-lg shadow-black/25',
        accent && 'border-[color:var(--app-accent)]/30 bg-[linear-gradient(170deg,color-mix(in_srgb,var(--app-accent)_8%,var(--app-surface)_92%),color-mix(in_srgb,var(--app-surface-elevated)_90%,black_10%))] shadow-[0_0_24px_-8px_var(--app-accent)]',
        interactive && 'interactive-card hover:border-[color:var(--app-accent)]/40 active:scale-[0.99] duration-200 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
