type StatPillProps = {
  label: string;
  value: string | number;
};

export default function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="stat-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-sm text-xs font-mono text-zinc-200">
      <span className="text-[var(--app-accent)] font-bold tabular-nums">{value}</span>
      <span className="uppercase tracking-wider text-zinc-400 text-[10px] font-medium">{label}</span>
    </div>
  );
}
