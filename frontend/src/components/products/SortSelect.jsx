import { SORT_OPTIONS } from '../../constants/navigation'

export default function SortSelect({ value, onChange, className = '' }) {
  return (
    <label className={`flex min-w-0 items-center gap-2 text-sm ${className}`}>
      <span className="whitespace-nowrap text-muted">Sort by</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full min-w-0 rounded-control border border-line bg-surface px-3 text-base focus:border-ink focus:outline-none sm:w-auto sm:text-sm"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
