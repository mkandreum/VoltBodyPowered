import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  right?: ReactNode;
};

export default function SectionHeader({ title, subtitle, icon: Icon, right }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 gap-4">
      <div>
        <h2 className="gym-heading text-lg sm:text-xl font-bold text-white flex items-center gap-2 tracking-tight">
          {Icon && <Icon size={20} className="text-[var(--app-accent)] shrink-0" />}
          <span>{title}</span>
        </h2>
        {subtitle && <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-normal">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
