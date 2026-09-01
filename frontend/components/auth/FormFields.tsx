import { SelectHTMLAttributes, InputHTMLAttributes } from "react";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
}

function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  children,
}: FieldWrapperProps & { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-text-faint">{hint}</p>}
      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  );
}

type InputProps = FieldWrapperProps & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, htmlFor, hint, error, ...rest }: InputProps) {
  return (
    <FieldShell label={label} htmlFor={htmlFor} hint={hint} error={error}>
      <input id={htmlFor} name={htmlFor} className="input" {...rest} />
    </FieldShell>
  );
}

type SelectProps = FieldWrapperProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: { value: string; label: string }[];
    placeholder?: string;
  };

export function SelectField({
  label,
  htmlFor,
  hint,
  error,
  options,
  placeholder,
  ...rest
}: SelectProps) {
  return (
    <FieldShell label={label} htmlFor={htmlFor} hint={hint} error={error}>
      <select id={htmlFor} name={htmlFor} className="input" {...rest}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
