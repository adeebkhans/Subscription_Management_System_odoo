import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cx } from '../../lib/cx';

type AlertTone = 'error' | 'success' | 'info' | 'warning';

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert
} as const;

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function Alert({ tone = 'info', title, children, action }: AlertProps) {
  const Icon = icons[tone];
  return (
    <div className={cx('alert', `alert-${tone}`)} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} className="alert-icon" aria-hidden="true" />
      <div className="alert-content">
        {title && <p className="alert-title">{title}</p>}
        <div className="alert-message">{children}</div>
      </div>
      {action && <div className="alert-action">{action}</div>}
    </div>
  );
}
