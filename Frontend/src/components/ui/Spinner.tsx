import { Loader2 } from 'lucide-react';
import { cx } from '../../lib/cx';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span className={cx('spinner', className)} role="status">
      <Loader2 className="spin" size={18} aria-hidden="true" />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
