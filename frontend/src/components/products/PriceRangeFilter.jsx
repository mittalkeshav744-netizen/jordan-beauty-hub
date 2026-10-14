import { useId, useState } from 'react'

const clamp = (value, low, high) => Math.min(Math.max(value, low), high)
const digitsOnly = (text) => text.replace(/\D/g, '')

function PriceInput({ id, label, value, onChange, onCommit }) {
  return (
    <div className="flex h-11 min-w-0 flex-1 items-center gap-1 rounded-control border border-line bg-surface px-3 focus-within:border-ink">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span aria-hidden="true" className="text-sm text-muted">
        ₹
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(digitsOnly(event.target.value))}
        onBlur={onCommit}
        className="w-full min-w-0 bg-transparent text-right text-base outline-none sm:text-sm"
      />
    </div>
  )
}

/**
 * Two-thumb price slider with matching ₹ boxes. bounds: { min, max } as decimal strings.
 * Values are applied when a thumb is released, a box loses focus or Enter is pressed.
 * Remount it (via `key`) when the bounds or applied prices change.
 */
export default function PriceRangeFilter({ bounds, minPrice, maxPrice, onChange }) {
  const floor = Math.floor(Number(bounds.min))
  const ceiling = Math.ceil(Number(bounds.max))
  const [low, setLow] = useState(String(minPrice ? clamp(Number(minPrice), floor, ceiling) : floor))
  const [high, setHigh] = useState(String(maxPrice ? clamp(Number(maxPrice), floor, ceiling) : ceiling))
  const id = useId()

  const lowValue = low === '' ? floor : clamp(Number(low), floor, ceiling)
  const highValue = high === '' ? ceiling : clamp(Number(high), floor, ceiling)
  const span = ceiling - floor || 1
  const lowPercent = ((Math.min(lowValue, highValue) - floor) / span) * 100
  const highPercent = ((Math.max(lowValue, highValue) - floor) / span) * 100

  const commit = () => {
    const nextLow = Math.min(lowValue, highValue)
    const nextHigh = Math.max(lowValue, highValue)
    setLow(String(nextLow))
    setHigh(String(nextHigh))
    const next = {
      minPrice: nextLow > floor ? String(nextLow) : '',
      maxPrice: nextHigh < ceiling ? String(nextHigh) : '',
    }
    if (next.minPrice !== minPrice || next.maxPrice !== maxPrice) onChange(next)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    commit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${lowPercent}%`, right: `${100 - highPercent}%` }}
        />
        <input
          type="range"
          aria-label="Minimum price"
          min={floor}
          max={ceiling}
          value={lowValue}
          onChange={(event) => setLow(String(Math.min(Number(event.target.value), highValue)))}
          onPointerUp={commit}
          onKeyUp={commit}
          className={`dual-range ${lowPercent > 50 ? 'z-10' : ''}`}
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={floor}
          max={ceiling}
          value={highValue}
          onChange={(event) => setHigh(String(Math.max(Number(event.target.value), lowValue)))}
          onPointerUp={commit}
          onKeyUp={commit}
          className="dual-range"
        />
      </div>
      <div className="flex items-center gap-3">
        <PriceInput id={`${id}-min`} label="Minimum price in rupees" value={low} onChange={setLow} onCommit={commit} />
        <span className="text-sm text-muted">to</span>
        <PriceInput id={`${id}-max`} label="Maximum price in rupees" value={high} onChange={setHigh} onCommit={commit} />
      </div>
      <button type="submit" className="sr-only">
        Apply price
      </button>
    </form>
  )
}
