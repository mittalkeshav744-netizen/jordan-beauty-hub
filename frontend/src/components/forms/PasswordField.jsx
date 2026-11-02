import { useId, useState } from 'react'

/**
 * Password input with show/hide toggle. Forwards the same field props as FormField usage.
 */
export default function PasswordField({
  label,
  error,
  hint,
  className = '',
  required,
  id: idProp,
  ...inputProps
}) {
  const autoId = useId()
  const id = idProp || autoId
  const [visible, setVisible] = useState(false)
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`auth-beauty__input pr-12 ${error ? 'border-danger' : ''}`}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute top-1/2 right-2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-btn text-muted transition-colors hover:bg-subtle hover:text-ink"
          aria-label={visible ? 'Hide characters' : 'Show characters'}
          title={visible ? 'Hide characters' : 'Show characters'}
        >
          {visible ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c5 0 9.3 3.1 11 7-0.5 1.1-1.2 2.2-2.1 3.1" />
              <path d="M6.1 6.1C4.2 7.4 2.7 9.1 1.9 11c1.7 3.9 6 7 10.1 7 1.4 0 2.7-.3 3.9-.8" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M1.9 12C3.6 8.1 7.9 5 12 5s8.4 3.1 10.1 7c-1.7 3.9-6 7-10.1 7S3.6 15.9 1.9 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
