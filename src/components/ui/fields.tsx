import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "./cn";

const controlClass =
  "h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-text " +
  "placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-1 " +
  "focus-visible:outline-accent aria-[invalid=true]:border-error disabled:opacity-50";

interface FieldBase {
  label: string;
  error?: string;
  hint?: string;
}

function FieldMessages({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return (
    <>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-text-muted mt-1 text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-error mt-1 text-xs">
          {error}
        </p>
      )}
    </>
  );
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldBase;

export function Input({
  label,
  error,
  hint,
  className,
  id: idProp,
  required,
  ...rest
}: InputProps) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(controlClass, className)}
        {...rest}
      />
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  FieldBase & { options: Array<{ value: string; label: string }> };

export function Select({
  label,
  error,
  hint,
  options,
  className,
  id: idProp,
  ...rest
}: SelectProps) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(controlClass, className)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  );
}

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string };

export function Checkbox({ label, className, id: idProp, ...rest }: CheckboxProps) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        className={cn(
          "accent-primary focus-visible:outline-accent size-5 focus-visible:outline-2",
          className,
        )}
        {...rest}
      />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  );
}

export interface RadioGroupProps {
  legend: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function RadioGroup({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
}: RadioGroupProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === undefined ? undefined : value === o.value}
            defaultChecked={value === undefined ? defaultValue === o.value : undefined}
            onChange={() => onChange?.(o.value)}
            className="accent-primary focus-visible:outline-accent size-5 focus-visible:outline-2"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
