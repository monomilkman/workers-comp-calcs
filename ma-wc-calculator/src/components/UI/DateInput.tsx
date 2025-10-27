import type { InputHTMLAttributes } from 'react';

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helpText?: string;
  error?: string;
}

/**
 * Reusable Date Input Component
 * Standardizes date input across the application
 */
export function DateInput({
  value,
  onChange,
  label,
  helpText,
  error,
  id,
  className = '',
  disabled,
  ...props
}: DateInputProps) {
  const helpTextId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
          {helpText && (
            <span id={helpTextId} className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              {helpText}
            </span>
          )}
        </label>
      )}
      <input
        {...props}
        type="date"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${className}`}
        disabled={disabled}
        aria-label={label || props['aria-label']}
        aria-describedby={[helpTextId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? true : undefined}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
