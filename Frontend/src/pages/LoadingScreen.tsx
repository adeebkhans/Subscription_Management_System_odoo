import { Brand } from '../components/Brand';

export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <Brand />
      <div className="loading-bar" role="progressbar" aria-label="Loading workspace">
        <span />
      </div>
      <p>Preparing your workspace…</p>
    </div>
  );
}
