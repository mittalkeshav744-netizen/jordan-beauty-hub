import Button from './Button'

function Chevron({ direction }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      {direction === 'left' ? <path d="M15 6 9 12l6 6" /> : <path d="m9 6 6 6-6 6" />}
    </svg>
  )
}

/**
 * Standard list pagination for owner portal and shop lists.
 * Hides itself when there is only one page.
 */
export default function Pagination({ page, pageSize, totalCount, onPageChange }) {
  const total = Number(totalCount) || 0
  const size = Math.max(1, Number(pageSize) || 1)
  const totalPages = Math.max(1, Math.ceil(total / size))
  if (total <= 0 || totalPages <= 1) return null

  const current = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const from = (current - 1) * size + 1
  const to = Math.min(current * size, total)

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === current) return
    onPageChange(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center justify-center gap-3 pt-8 sm:flex-row sm:gap-4"
    >
      <p className="text-xs text-muted sm:mr-auto sm:text-sm">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          aria-label="Previous page"
          title="Previous"
          onClick={() => goToPage(current - 1)}
          disabled={current <= 1}
        >
          <Chevron direction="left" />
        </Button>
        <span className="text-sm whitespace-nowrap text-muted" aria-current="page">
          Page {current} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          aria-label="Next page"
          title="Next"
          onClick={() => goToPage(current + 1)}
          disabled={current >= totalPages}
        >
          <Chevron direction="right" />
        </Button>
      </div>
    </nav>
  )
}
