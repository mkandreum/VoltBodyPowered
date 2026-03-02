type AppCardProps = {
  children: any;
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
        'rounded-3xl border p-5 transition-all',
        'bg-[var(--app-surface)] border-[var(--app-border)]',
        accent && 'border-[color:var(--app-accent)]/40 bg-[color:var(--app-accent)]/5',
        interactive && 'hover:border-[color:var(--app-accent)]/50',
        className
      )}
    >
      {children}
    </div>
  );
}
