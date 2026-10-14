import PriceRangeFilter from './PriceRangeFilter'

function FilterSection({ title, children }) {
  return (
    <details open className="group border-b border-line py-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold tracking-[0.2em] uppercase [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="pt-1 pb-2">{children}</div>
    </details>
  )
}

function CheckboxGroup({ legend, options, selected, onToggle }) {
  return (
    <fieldset className="space-y-0.5">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.slug}
          className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-ink-soft hover:text-ink lg:min-h-9"
        >
          <input
            type="checkbox"
            checked={selected.includes(option.slug)}
            onChange={() => onToggle(option.slug)}
            className="h-4 w-4 shrink-0 accent-ink"
          />
          {option.name}
        </label>
      ))}
    </fieldset>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink-soft hover:text-ink">
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-line transition-colors duration-200 peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow-card after:transition-transform after:duration-200 peer-checked:after:translate-x-5"
      />
      {label}
    </label>
  )
}

const toggleValue = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

/**
 * Categories are chosen from the main navigation, so they are not repeated here.
 * filters: { brand: string[], minPrice, maxPrice, inStock }
 * priceBounds: { min, max } decimal strings, or null while loading / when there is nothing to range.
 * onChange(partialFilters) merges the change into the URL query string.
 */
export default function FilterPanel({ brands, priceBounds, filters, onChange, onClear, showHeader = true }) {
  const showPrice =
    priceBounds?.min != null && Math.floor(Number(priceBounds.min)) < Math.ceil(Number(priceBounds.max))

  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 className="text-sm font-semibold tracking-[0.2em] uppercase">Filters</h2>
          <button
            type="button"
            onClick={onClear}
            className="-my-2 py-2 text-xs text-accent underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {brands.length > 1 && (
        <FilterSection title="Brand">
          <CheckboxGroup
            legend="Brand"
            options={brands}
            selected={filters.brand}
            onToggle={(slug) => onChange({ brand: toggleValue(filters.brand, slug) })}
          />
        </FilterSection>
      )}

      <FilterSection title="Availability">
        <Toggle label="In stock only" checked={filters.inStock} onChange={() => onChange({ inStock: !filters.inStock })} />
      </FilterSection>

      {showPrice && (
        <FilterSection title="Price">
          <PriceRangeFilter
            key={`${priceBounds.min}-${priceBounds.max}-${filters.minPrice}-${filters.maxPrice}`}
            bounds={priceBounds}
            minPrice={filters.minPrice}
            maxPrice={filters.maxPrice}
            onChange={onChange}
          />
        </FilterSection>
      )}
    </div>
  )
}
