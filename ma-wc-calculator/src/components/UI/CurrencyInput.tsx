import type { InputHTMLAttributes } from 'react';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helpText?: string;
  error?: string;
}

/**
 * Reusable Currency Input Component
 * Displays a $ prefix and handles currency input formatting
 */
export function CurrencyInput({
  value,
  onChange,
  label,
  helpText,
  error,
  id,
  placeholder = '0.00',
  className = '',
  disabled,
  ...props
}: CurrencyInputProps) {
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
      <div className="relative">
        <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400" aria-hidden="true">$</span>
        <input
          {...props}
          type="text"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`pl-8 w-full ${className}`}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label || props['aria-label']}
          aria-describedby={[helpTextId, errorId].filter(Boolean).join(' ') || undefined}
          aria-invalid={error ? true : undefined}
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
