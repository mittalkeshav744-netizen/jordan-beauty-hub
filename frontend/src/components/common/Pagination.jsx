import Button from './Button'

export default function Pagination({ page, pageSize, totalCount, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (totalPages <= 1) return null

  const goToPage = (nextPage) => {
    onPageChange(nextPage)
    window.scrollTo({ top: 0 })
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3 pt-8 sm:gap-4">
      <Button variant="outline" size="sm" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
        Previous
      </Button>
      <span className="text-sm whitespace-nowrap text-muted" aria-current="page">
        Page {page} of {totalPages}
      </span>
      <Button variant="outline" size="sm" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
        Next
      </Button>
    </nav>
  )
}
