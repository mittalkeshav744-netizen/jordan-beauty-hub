/**
 * Shared customer success moment (tick + congrats), used after checkout and
 * other major milestones. Small actions should keep using toasts instead.
 */
export default function SuccessPanel({
  title,
  message,
  children,
  actions,
  className = '',
  compact = false,
  headingId = 'success-heading',
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={[
        'text-center',
        compact
          ? 'space-y-3 rounded-card border border-success/20 bg-success-soft/40 p-4'
          : 'mx-auto max-w-xl space-y-6 rounded-card border border-line p-5 shadow-card sm:p-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'success-tick mx-auto flex items-center justify-center rounded-full bg-success-soft font-semibold text-success',
          compact ? 'h-11 w-11 text-lg' : 'h-16 w-16 text-3xl',
        ].join(' ')}
      >
        ✓
      </span>
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        {compact ? (
          <h2 id={headingId} className="text-base font-semibold text-ink">
            {title}
          </h2>
        ) : (
          <h1 id={headingId} className="section-title">
            {title}
          </h1>
        )}
        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </div>
      {children}
      {actions ? (
        <div
          className={
            compact
              ? 'flex flex-col gap-2'
              : 'flex flex-col gap-3 sm:flex-row sm:justify-center'
          }
        >
          {actions}
        </div>
      ) : null}
    </section>
  )
}
