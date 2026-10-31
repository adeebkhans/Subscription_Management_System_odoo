import { useId, useState } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { cx } from '../../lib/cx';

interface BaseFieldProps {
  label?: string;
  error?: string;
  hint?: string;
}

function FieldMessages({
  id,
  hint,
  error
}: {
  id: string;
  hint?: string;
  error?: string;
}) {
  if (!hint && !error) return null;
  return (
    <div className="field-messages">
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  const ids: string[] = [];
  if (hint) ids.push(`${id}-hint`);
  if (error) ids.push(`${id}-error`);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseFieldProps {
  leadingIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leadingIcon,
  rightSlot,
  id,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cx('field', error && 'field-invalid')}>
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
          {props.required && <span className="field-required">*</span>}
        </label>
      )}
      <div
        className={cx(
          'input-shell',
          leadingIcon ? 'input-shell-icon' : undefined,
          rightSlot ? 'input-shell-action' : undefined
        )}
      >
        {leadingIcon && <span className="input-leading">{leadingIcon}</span>}
        <input
          id={inputId}
          className={cx('input', className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error)}
          {...props}
        />
        {rightSlot && <span className="input-trailing">{rightSlot}</span>}
      </div>
      <FieldMessages id={inputId} hint={hint} error={error} />
    </div>
  );
}

interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightSlot'> {
  showLabel?: string;
  hideLabel?: string;
}

export function PasswordInput({
  showLabel = 'Show password',
  hideLabel = 'Hide password',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          className="input-icon-button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? hideLabel : showLabel}
          title={visible ? hideLabel : showLabel}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      }
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, BaseFieldProps {
  children: ReactNode;
}

export function Select({ label, error, hint, id, className, children, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={cx('field', error && 'field-invalid')}>
      {label && (
        <label className="field-label" htmlFor={selectId}>
          {label}
          {props.required && <span className="field-required">*</span>}
        </label>
      )}
      <div className="select-shell">
        <select
          id={selectId}
          className={cx('select', className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, hint, error)}
          {...props}
        >
          {children}
        </select>
      </div>
      <FieldMessages id={selectId} hint={hint} error={error} />
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseFieldProps {}

export function Textarea({ label, error, hint, id, className, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className={cx('field', error && 'field-invalid')}>
      {label && (
        <label className="field-label" htmlFor={textareaId}>
          {label}
          {props.required && <span className="field-required">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cx('textarea', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(textareaId, hint, error)}
        {...props}
      />
      <FieldMessages id={textareaId} hint={hint} error={error} />
    </div>
  );
}

interface CheckboxProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
}

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  name
}: CheckboxProps) {
  return (
    <label className={cx('checkbox', disabled && 'is-disabled')}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="checkbox-box" aria-hidden="true">
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      <span className="checkbox-copy">
        <span className="checkbox-label">{label}</span>
        {description && <span className="checkbox-description">{description}</span>}
      </span>
    </label>
  );
}
