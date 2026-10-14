export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 10,
  disabled = false,
  label = 'Quantity',
}) {
  const buttonClasses =
    'flex h-full w-11 items-center justify-center text-lg hover:bg-subtle disabled:opacity-40 disabled:hover:bg-transparent'

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
      <output aria-live="polite" className="flex w-10 items-center justify-center text-sm font-medium">
        {value}
      </output>
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
