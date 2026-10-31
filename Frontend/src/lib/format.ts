import type { BillingFrequency, ProductType, Role } from '../types';

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

export function formatMoney(value: number | string | null | undefined): string {
  const number = typeof value === 'string' ? Number(value) : value;
  if (number === null || number === undefined || !Number.isFinite(number)) {
    return '—';
  }
  return moneyFormatter.format(number);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

export function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function roleLabel(role: Role): string {
  if (role === 'ADMIN') return 'Administrator';
  if (role === 'STAFF') return 'Staff';
  return 'Customer';
}

export function productTypeLabel(type: ProductType): string {
  return type === 'GOODS' ? 'Goods' : 'Service';
}

export function frequencyLabel(frequency: BillingFrequency): string {
  return titleCase(frequency);
}

export function frequencySuffix(frequency: BillingFrequency): string {
  if (frequency === 'DAILY') return '/ day';
  if (frequency === 'WEEKLY') return '/ week';
  if (frequency === 'MONTHLY') return '/ month';
  return '/ year';
}

export function availabilityLabel(
  availableFrom: string | null | undefined,
  availableUntil: string | null | undefined
): string {
  if (availableFrom && availableUntil) {
    return `${formatDate(availableFrom)} – ${formatDate(availableUntil)}`;
  }
  if (availableFrom) return `From ${formatDate(availableFrom)}`;
  if (availableUntil) return `Until ${formatDate(availableUntil)}`;
  return 'Always available';
}
