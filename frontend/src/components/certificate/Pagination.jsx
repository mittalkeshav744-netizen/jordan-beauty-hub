import FaIcon from '../manage/FaIcon'

const SIZES = [10, 25, 50, 100]

export default function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize))
  const safePage = Math.min(page, totalPages)

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-[var(--cert-muted)]">
        {totalCount} record{totalCount === 1 ? '' : 's'} · Page {safePage} of {totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-[var(--cert-muted)]">
          Rows
          <select
            className="cert-input w-auto min-h-9 py-1"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="cert-btn-outline cert-icon-btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
          title="First page"
        >
          <FaIcon icon="anglesLeft" className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="cert-btn-outline cert-icon-btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
          title="Previous page"
        >
          <FaIcon icon="chevronLeft" className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="cert-btn-outline cert-icon-btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
          title="Next page"
        >
          <FaIcon icon="chevronRight" className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="cert-btn-outline cert-icon-btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
          title="Last page"
        >
          <FaIcon icon="anglesRight" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
