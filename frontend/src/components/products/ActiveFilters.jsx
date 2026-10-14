import { formatPrice } from '../../utils/format'

function priceLabel(minPrice, maxPrice) {
  if (minPrice && maxPrice) return `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
  if (minPrice) return `From ${formatPrice(minPrice)}`
  return `Up to ${formatPrice(maxPrice)}`
}

/** Removable chips for every applied filter, plus "Clear all". Renders nothing when no filter is set. */
export default function ActiveFilters({ filters, categories, brands, onChange, onClear }) {
  const nameOf = (list, slug) => list.find((item) => item.slug === slug)?.name ?? slug
  const chips = [
    ...filters.category.map((slug) => ({
      key: `category-${slug}`,
      label: nameOf(categories, slug),
      remove: () => onChange({ category: filters.category.filter((item) => item !== slug) }),
    })),
    ...filters.brand.map((slug) => ({
      key: `brand-${slug}`,
      label: nameOf(brands, slug),
      remove: () => onChange({ brand: filters.brand.filter((item) => item !== slug) }),
    })),
  ]
  if (filters.minPrice || filters.maxPrice) {
    chips.push({
      key: 'price',
      label: priceLabel(filters.minPrice, filters.maxPrice),
      remove: () => onChange({ minPrice: '', maxPrice: '' }),
    })
  }
  if (filters.inStock) {
    chips.push({ key: 'stock', label: 'In stock only', remove: () => onChange({ inStock: false }) })
  }
  if (chips.length === 0) return null

  return (
    <ul aria-label="Applied filters" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={chip.remove}
            aria-label={`Remove filter: ${chip.label}`}
            className="inline-flex min-h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-xs text-ink-soft hover:border-ink hover:text-ink"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
            {chip.label}
          </button>
        </li>
      ))}
      {chips.length > 1 && (
        <li>
          <button
            type="button"
            onClick={onClear}
            className="min-h-9 px-2 text-xs font-semibold text-accent underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </li>
      )}
    </ul>
  )
}
