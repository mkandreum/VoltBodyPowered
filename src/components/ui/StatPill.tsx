type StatPillProps = {
  label: string;
  value: string | number;
};

export default function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="stat-pill inline-flex items-center px-3 py-1.5 rounded-full border border-white/10 bg-black/40 text-xs font-mono text-gray-200">
      <span className="text-[var(--app-accent)] font-bold mr-1.5">{value}</span>
      <span className="uppercase tracking-wider text-gray-400 text-[11px]">{label}</span>
    </div>
  );
}
