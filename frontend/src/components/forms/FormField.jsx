import { useId } from 'react'

const CONTROL_CLASSES =
  'w-full min-w-0 rounded-control border bg-surface px-3 text-base text-ink placeholder:text-muted sm:text-sm ' +
  'transition-colors focus:border-ink focus:outline-none focus-visible:outline-2 ' +
  'focus-visible:outline-offset-0 focus-visible:outline-accent disabled:bg-subtle'

/**
 * Label + control + error message. `as` chooses the control: input, select or textarea.
 * Select options are passed as children.
 */
export default function FormField({
  label,
  error,
  hint,
  as: Control = 'input',
  className = '',
  required,
  children,
  ...controlProps
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined
  const sizeClass = Control === 'textarea' ? 'min-h-24 py-2' : 'h-11'

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {label}
        {required && <span className="text-accent"> *</span>}
      </label>
      <Control
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${CONTROL_CLASSES} ${sizeClass} ${error ? 'border-danger' : 'border-line'}`}
        {...controlProps}
      >
        {children}
      </Control>
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
