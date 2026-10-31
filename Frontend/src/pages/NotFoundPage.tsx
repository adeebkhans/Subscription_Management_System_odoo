import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Brand } from '../components/Brand';

export function NotFoundPage() {
  return (
    <div className="status-page">
      <Brand />
      <span className="status-icon">
        <Compass size={28} />
      </span>
      <p className="status-code">404</p>
      <h1>This page drifted out of orbit</h1>
      <p className="status-copy">
        The page you are looking for does not exist or may have moved.
      </p>
      <Link to="/app" className="button button-primary">
        <span>Back to dashboard</span>
      </Link>
    </div>
  );
}
