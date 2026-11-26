/**
 * Shade / swatch colour for product options.
 * Colour picker + hex field; blank means no swatch (size-only options).
 */
export default function ShadeColorField({
  id = 'shade-hex',
  label = 'Shade colour',
  value = '',
  onChange,
  hint = 'Optional. Used for lipstick / foundation swatches in the shop.',
  error,
  className = '',
}) {
  const hex = typeof value === 'string' ? value.trim() : ''
  const hasColour = /^#[0-9A-Fa-f]{6}$/.test(hex)
  const pickerValue = hasColour ? hex : '#c46a6a'

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="mt-1 flex min-h-11 items-center gap-2">
        <input
          id={`${id}-picker`}
          type="color"
          value={pickerValue}
          aria-label={`${label} picker`}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-11 w-14 cursor-pointer rounded-control border border-line bg-surface p-1"
        />
        <input
          id={id}
          type="text"
          inputMode="text"
          spellCheck={false}
          placeholder="#C46A6A"
          value={hex}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-sm uppercase tracking-wide text-ink focus:border-accent focus:outline-none"
        />
        {hasColour || hex ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="btn-text shrink-0 text-xs text-muted"
          >
            Clear
          </button>
        ) : null}
      </div>
      {hasColour ? (
        <p className="mt-1 flex items-center gap-2 text-xs text-muted">
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 rounded-full border border-line"
            style={{ backgroundColor: hex }}
          />
          Shop will show this swatch
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  )
}
