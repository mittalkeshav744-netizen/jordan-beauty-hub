/** Shade swatches (when a colour is set) or size buttons for choosing a variant. */
export default function VariantSelector({ variants, selectedId, onSelect }) {
  if (variants.length <= 1) return null
  const selected = variants.find((variant) => variant.id === selectedId)
  const usesSwatches = variants.every((variant) => variant.shade_hex)

  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold tracking-widest uppercase">
        {usesSwatches ? 'Shade' : 'Size'}: <span className="font-normal normal-case">{selected?.name}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const isSelected = variant.id === selectedId
          const label = `${variant.name}${variant.is_in_stock ? '' : ' (sold out)'}`
          return usesSwatches ? (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant.id)}
              aria-label={label}
              aria-pressed={isSelected}
              title={label}
              className={`relative h-11 w-11 overflow-hidden rounded-full border-2 ${isSelected ? 'border-ink' : 'border-surface ring-1 ring-line'}`}
              style={{ backgroundColor: variant.shade_hex }}
            >
              {!variant.is_in_stock && (
                <span aria-hidden="true" className="absolute inset-0 m-auto h-px w-full rotate-45 bg-white" />
              )}
            </button>
          ) : (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant.id)}
              aria-pressed={isSelected}
              className={`min-h-11 max-w-full rounded-control border px-4 py-2 text-sm ${
                isSelected ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'
              } ${variant.is_in_stock ? '' : 'text-muted line-through'}`}
            >
              {variant.name}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
