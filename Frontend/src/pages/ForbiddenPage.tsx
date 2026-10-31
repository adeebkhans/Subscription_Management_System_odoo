import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Brand } from '../components/Brand';

export function ForbiddenPage() {
  return (
    <div className="status-page">
      <Brand />
      <span className="status-icon status-icon-warning">
        <ShieldX size={28} />
      </span>
      <p className="status-code">403</p>
      <h1>You do not have access to this area</h1>
      <p className="status-copy">
        This screen is limited to a different role. If you believe you should have access,
        ask an administrator to review your account.
      </p>
      <Link to="/app" className="button button-primary">
        <span>Back to dashboard</span>
      </Link>
    </div>
  );
}
