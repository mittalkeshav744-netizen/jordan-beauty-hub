import { useState } from 'react'

export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 10,
  disabled = false,
  label = 'Quantity',
  onExceed,
}) {
  const [draft, setDraft] = useState(null)
  const [trackedValue, setTrackedValue] = useState(value)
  if (value !== trackedValue) {
    setTrackedValue(value)
    setDraft(null)
  }
  const shown = draft ?? String(value)
  const buttonClasses =
    'flex h-full w-11 items-center justify-center text-lg hover:bg-subtle disabled:opacity-40 disabled:hover:bg-transparent'

  const commit = () => {
    const parsed = Number.parseInt(shown, 10)
    if (!Number.isFinite(parsed)) {
      setDraft(null)
      return
    }
    if (parsed > max) {
      setDraft(String(max))
      if (max !== value) onChange(max)
      onExceed?.(parsed, max)
      return
    }
    setDraft(null)
    const next = Math.max(min, parsed)
    if (next !== value) onChange(next)
  }

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-11 shrink-0 items-stretch overflow-hidden rounded-control border border-line"
    >
      <button
        type="button"
        className={buttonClasses}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        value={shown}
        disabled={disabled}
        onFocus={(event) => {
          setDraft(String(value))
          event.target.select()
        }}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
        className="w-14 bg-transparent text-center text-sm font-medium text-ink outline-none disabled:opacity-40"
      />
      <button
        type="button"
        className={buttonClasses}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
