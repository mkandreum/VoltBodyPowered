type StatPillProps = {
  label: string;
  value: string | number;
};

export default function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="stat-pill inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-sm text-xs font-mono text-zinc-200 min-w-0 max-w-full">
      <span className="text-[var(--app-accent)] font-bold tabular-nums shrink-0">{value}</span>
      <span className="uppercase tracking-wider text-zinc-400 text-[9px] sm:text-[10px] font-medium truncate">{label}</span>
    </div>
  );
}
