import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

const CONTROL =
  "w-full rounded-xl border bg-surface text-sm text-ink placeholder:text-ink-subtle transition-colors focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-subtle";

const stateClasses = (error) =>
  error
    ? "border-danger focus:border-danger focus:ring-danger/10"
    : "border-line-strong hover:border-ink-subtle focus:border-brand-600 focus:ring-brand-600/12";

/**
 * Label + control + help/error text. Pass the control as children, or use
 * the Input/Select/Textarea shortcuts below which wire `id` automatically.
 */
export function Field({ label, help, error, required, htmlFor, className, children }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : (
        help && <p className="text-xs text-ink-muted">{help}</p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { label, help, error, required, className, inputClassName, leftIcon: LeftIcon, id, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <Field label={label} help={help} error={error} required={required} htmlFor={fieldId} className={className}>
      <div className="relative">
        {LeftIcon && (
          <LeftIcon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
        )}
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={!!error}
          className={cn(CONTROL, stateClasses(error), "h-11 px-3.5", LeftIcon && "pl-10", inputClassName)}
          {...props}
        />
      </div>
    </Field>
  );
});

export const Select = forwardRef(function Select(
  { label, help, error, required, className, inputClassName, id, children, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <Field label={label} help={help} error={error} required={required} htmlFor={fieldId} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={!!error}
          className={cn(CONTROL, stateClasses(error), "h-11 appearance-none pl-3.5 pr-10", inputClassName)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
      </div>
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, help, error, required, className, inputClassName, id, rows = 4, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <Field label={label} help={help} error={error} required={required} htmlFor={fieldId} className={className}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={!!error}
        className={cn(CONTROL, stateClasses(error), "px-3.5 py-3 leading-relaxed", inputClassName)}
        {...props}
      />
    </Field>
  );
});
