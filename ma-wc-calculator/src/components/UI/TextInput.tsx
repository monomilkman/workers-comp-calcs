import type { InputHTMLAttributes } from 'react';

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helpText?: string;
  error?: string;
}

/**
 * Reusable Text Input Component
 * Standardizes text input across the application
 */
export function TextInput({
  value,
  onChange,
  label,
  helpText,
  error,
  id,
  type = 'text',
  className = '',
  disabled,
  ...props
}: TextInputProps) {
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
        type={type}
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
