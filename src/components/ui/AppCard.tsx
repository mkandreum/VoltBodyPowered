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
        'app-card rounded-[1.35rem] border p-5 transition-all',
        'bg-[linear-gradient(170deg,color-mix(in_srgb,var(--app-surface)_90%,black_10%),color-mix(in_srgb,var(--app-surface-elevated)_90%,black_10%))] border-[var(--app-border)]',
        accent && 'border-[color:var(--app-accent)]/35 bg-[linear-gradient(170deg,color-mix(in_srgb,var(--app-accent)_7%,var(--app-surface)_93%),color-mix(in_srgb,var(--app-surface-elevated)_92%,black_8%))]',
        interactive && 'interactive-card hover:border-[color:var(--app-accent)]/50',
        className
      )}
    >
      {children}
    </div>
  );
}
