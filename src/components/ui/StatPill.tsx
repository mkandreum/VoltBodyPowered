type StatPillProps = {
  label: string;
  value: string | number;
};

export default function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="stat-pill px-3 py-2 rounded-full border border-[var(--app-border)] bg-black/35 text-[11px] font-mono text-gray-300">
      <span className="text-[var(--app-accent)] font-bold mr-1">{value}</span>
      <span className="uppercase tracking-wider text-gray-400">{label}</span>
    </div>
  );
}
