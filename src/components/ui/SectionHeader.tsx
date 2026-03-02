import type { LucideIcon } from 'lucide-react';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  right?: any;
};

export default function SectionHeader({ title, subtitle, icon: Icon, right }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          {Icon && <Icon size={20} className="text-[var(--app-accent)]" />}
          {title}
        </h2>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
