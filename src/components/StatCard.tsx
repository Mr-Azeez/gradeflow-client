import type { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
}

const StatCard = ({
  icon,
  label,
  value,
  subtitle,
  accentColor = "text-[var(--accent)]",
}: StatCardProps) => {
  return (
    <div className="glass-card-light p-5 stat-card animate-fade-in-up">
      <div className="flex items-start justify-between mb-3">
        <span className={`${accentColor} opacity-80`}>{icon}</span>
      </div>
      <p className="text-[var(--text-xs)] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
        {label}
      </p>
      <p className="text-[var(--text-3xl)] font-semibold font-mono text-[var(--text-primary)]">{value}</p>
      {subtitle && <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1">{subtitle}</p>}
    </div>
  );
};

export default StatCard;
