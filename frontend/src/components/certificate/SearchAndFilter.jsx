import FaIcon from '../manage/FaIcon'

export default function SearchAndFilter({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  actions,
}) {
  return (
    <div className="cert-card mb-4 flex flex-col gap-3 p-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1 sm:max-w-sm" htmlFor="cert-search">
          <span className="sr-only">Search</span>
          <FaIcon
            icon="search"
            className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cert-muted)]"
          />
          <input
            id="cert-search"
            className="cert-input cert-input--search pl-9"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>
        {filters.map((filter) => (
          <label key={filter.id} className="flex min-w-[9.5rem] flex-col gap-1 text-xs font-semibold text-[var(--cert-muted)]">
            <span className="sr-only">{filter.label}</span>
            <select
              aria-label={filter.label}
              className="cert-input"
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
            >
              {filter.options.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
