import { Orbit } from 'lucide-react';
import { cx } from '../lib/cx';

interface BrandProps {
  compact?: boolean;
  inverted?: boolean;
}

export function Brand({ compact = false, inverted = false }: BrandProps) {
  return (
    <div className={cx('brand', compact && 'brand-compact', inverted && 'brand-inverted')}>
      <span className="brand-mark" aria-hidden="true">
        <Orbit size={22} strokeWidth={2.2} />
      </span>
      <span className="brand-copy">
        <span className="brand-name">Orbit</span>
        {!compact && <span className="brand-tagline">Subscription management</span>}
      </span>
    </div>
  );
}
