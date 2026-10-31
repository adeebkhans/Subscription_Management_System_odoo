import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { frequencyLabel, productTypeLabel, roleLabel } from '../../lib/format';
import type { BillingFrequency, ProductType, Role } from '../../types';

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

export function Badge({
  children,
  tone = 'neutral',
  className
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return <span className={cx('badge', `badge-${tone}`, className)}>{children}</span>;
}

export function RoleBadge({ role }: { role: Role }) {
  const tone: BadgeTone = role === 'ADMIN' ? 'violet' : role === 'STAFF' ? 'info' : 'neutral';
  return <Badge tone={tone}>{roleLabel(role)}</Badge>;
}

export function ProductTypeBadge({ type }: { type: ProductType }) {
  return <Badge tone={type === 'SERVICE' ? 'info' : 'neutral'}>{productTypeLabel(type)}</Badge>;
}

export function FrequencyBadge({ frequency }: { frequency: BillingFrequency }) {
  return <Badge tone="primary">{frequencyLabel(frequency)}</Badge>;
}

export function StatusBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? 'success' : 'danger'}>{active ? 'Active' : 'Inactive'}</Badge>;
}
