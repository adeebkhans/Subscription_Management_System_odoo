import { Check, X } from 'lucide-react';
import { cx } from '../../lib/cx';
import { passwordChecks, passwordStrength } from '../../lib/validation';

export function PasswordChecklist({ value }: { value: string }) {
  const strength = passwordStrength(value);

  return (
    <div className="password-checklist">
      <div className="password-strength">
        <div className="password-strength-bars" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={cx(
                'password-strength-bar',
                index < strength.score && `is-${strength.tone}`
              )}
            />
          ))}
        </div>
        <span className={cx('password-strength-label', `is-${strength.tone}`)}>
          {value ? strength.label : 'Password strength'}
        </span>
      </div>
      <ul>
        {passwordChecks.map((check) => {
          const passed = check.test(value);
          return (
            <li key={check.label} className={passed ? 'is-passed' : undefined}>
              {passed ? <Check size={13} /> : <X size={13} />}
              {check.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
