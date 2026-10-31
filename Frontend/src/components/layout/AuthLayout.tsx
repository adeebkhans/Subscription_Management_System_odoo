import type { ReactNode } from 'react';
import { Layers, ShieldCheck, Users } from 'lucide-react';
import { Brand } from '../Brand';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Role-aware by design',
    copy: 'Admin, staff, and customer journeys stay cleanly separated.'
  },
  {
    icon: Layers,
    title: 'Plans and products in one place',
    copy: 'Manage the catalog and lifecycle policies without spreadsheets.'
  },
  {
    icon: Users,
    title: 'Built for your whole team',
    copy: 'Invite staff, keep permissions tight, and move faster together.'
  }
];

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <aside className="auth-visual">
        <Brand inverted />
        <div className="auth-visual-content">
          <span className="auth-kicker">Subscription operations, simplified</span>
          <h1>Subscriptions, without the chaos.</h1>
          <p>
            One calm workspace for plans, products, staff, and the customers who depend
            on them.
          </p>
          <ul className="auth-highlights">
            {highlights.map(({ icon: Icon, title: highlightTitle, copy }) => (
              <li key={highlightTitle}>
                <span className="auth-highlight-icon">
                  <Icon size={18} />
                </span>
                <span>
                  <strong>{highlightTitle}</strong>
                  <small>{copy}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-visual-foot">Orbit · Subscription management system</p>
      </aside>

      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-card">
          <header className="auth-card-header">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </header>
          {children}
          {footer && <div className="auth-card-footer">{footer}</div>}
        </div>
        <p className="auth-legal">
          Phase 1 workspace · Authentication, roles, and core master data
        </p>
      </main>
    </div>
  );
}
