import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  ChevronDown,
  Compass,
  CreditCard,
  BadgePercent,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Users,
  X
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { cx } from '../../lib/cx';
import { initials, roleLabel } from '../../lib/format';
import type { Role } from '../../types';
import { Brand } from '../Brand';
import { RoleBadge } from '../ui/Badge';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  ADMIN: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/subscriptions', label: 'Subscriptions', icon: CalendarClock },
    { to: '/app/quotations', label: 'Quotations', icon: FileText },
    { to: '/app/payment-terms', label: 'Payment terms', icon: CreditCard },
    { to: '/app/invoices', label: 'Invoices', icon: ReceiptText },
    { to: '/app/catalog', label: 'Catalog', icon: Compass },
    { to: '/app/products', label: 'Products', icon: Package },
    { to: '/app/plans', label: 'Plans', icon: Layers },
    { to: '/app/users', label: 'Team & users', icon: Users },
    { to: '/app/discounts', label: 'Discounts', icon: BadgePercent }
  ],
  STAFF: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/subscriptions', label: 'Subscriptions', icon: CalendarClock },
    { to: '/app/quotations', label: 'Quotations', icon: FileText },
    { to: '/app/payment-terms', label: 'Payment terms', icon: CreditCard },
    { to: '/app/invoices', label: 'Invoices', icon: ReceiptText },
    { to: '/app/catalog', label: 'Catalog', icon: Compass },
    { to: '/app/products', label: 'Products', icon: Package },
    { to: '/app/plans', label: 'Plans', icon: Layers }
  ],
  CUSTOMER: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/portal', label: 'My account', icon: ReceiptText },
    { to: '/app/catalog', label: 'Catalog', icon: Compass }
  ]
};

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const navItems = useMemo(() => (user ? NAV_ITEMS[user.role] : []), [user]);
  const currentLabel = useMemo(() => {
    const match = navItems.find(
      (item) =>
        location.pathname === item.to ||
        (!item.end && location.pathname.startsWith(`${item.to}/`))
    );
    return match?.label ?? 'Workspace';
  }, [location.pathname, navItems]);

  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [userMenuOpen]);

  if (!user) return null;

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div
        className={cx('sidebar-overlay', sidebarOpen && 'is-visible')}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={cx('sidebar', sidebarOpen && 'is-open')}>
        <div className="sidebar-brand">
          <Brand inverted />
          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <p className="nav-section-label">Workspace</p>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cx('nav-link', isActive && 'is-active')}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-phase">
            <span>Phase 4</span>
            <p>Promotions and customer self-service</p>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="icon-button topbar-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="topbar-context">
            <span>Workspace</span>
            <strong>{currentLabel}</strong>
          </div>

          <div className="topbar-actions">
            <div className="user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen((current) => !current)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className="avatar">{initials(user.name)}</span>
                <span className="user-menu-copy">
                  <strong>{user.name}</strong>
                  <span>{roleLabel(user.role)}</span>
                </span>
                <ChevronDown size={16} className={cx('chevron', userMenuOpen && 'is-open')} />
              </button>

              {userMenuOpen && (
                <div className="user-dropdown" role="menu">
                  <div className="user-dropdown-header">
                    <span className="avatar avatar-lg">{initials(user.name)}</span>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                  <div className="user-dropdown-role">
                    <span>Signed in as</span>
                    <RoleBadge role={user.role} />
                  </div>
                  <button type="button" className="user-dropdown-action" onClick={handleLogout}>
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
