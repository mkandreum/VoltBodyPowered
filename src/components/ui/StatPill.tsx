type StatPillProps = {
  label: string;
  value: string | number;
};

export default function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="stat-pill px-3 py-2 rounded-full border border-[var(--app-border)] bg-black/40 text-xs font-mono text-gray-300">
      <span className="text-[var(--app-accent)] font-semibold mr-1">{value}</span>
      {label}
    </div>
  );
}
