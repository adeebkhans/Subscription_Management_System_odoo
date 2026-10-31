import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'info';
}

export function StatCard({ label, value, hint, icon, tone = 'primary' }: StatCardProps) {
  return (
    <article className={cx('stat-card', `stat-card-${tone}`)}>
      <div className="stat-card-top">
        <span className="stat-card-icon">{icon}</span>
        {hint && <span className="stat-card-hint">{hint}</span>}
      </div>
      <p className="stat-card-value">{value}</p>
      <p className="stat-card-label">{label}</p>
    </article>
  );
}
