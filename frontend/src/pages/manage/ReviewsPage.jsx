import { useState } from 'react'
import { useSearchParams } from 'react-router'

import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import ManageToolbar from '../../components/manage/ManageToolbar'
import FaIcon from '../../components/manage/FaIcon'
import Pagination from '../../components/common/Pagination'
import Skeleton from '../../components/common/Skeleton'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'
import { formatDate } from '../../utils/format'

const PAGE_SIZE = 12
const BODY_PREVIEW_LENGTH = 220

export default function ReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const approvedParam = searchParams.get('approved')
  const [page, setPage] = useState(1)
  const [readingReview, setReadingReview] = useState(null)
  const { showToast } = useToast()

  const { data, isLoading, error, reload, setData } = useApi(
    () =>
      portalService.listReviews({
        page,
        page_size: PAGE_SIZE,
        approved: approvedParam === null ? undefined : approvedParam,
      }),
    [page, approvedParam],
  )

  const setFilter = (value) => {
    const next = new URLSearchParams()
    if (value !== '') next.set('approved', value)
    setPage(1)
    setSearchParams(next)
  }

  const reviews = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
  const totalCount = typeof data?.count === 'number' ? data.count : reviews.length

  const toggleApproval = async (review) => {
    try {
      const updated = await portalService.updateReview(review.id, { is_approved: !review.is_approved })
      if (Array.isArray(data?.results)) {
        setData({
          ...data,
          results: data.results.map((row) => (row.id === review.id ? updated : row)),
        })
      } else {
        reload()
      }
      showToast(updated.is_approved ? 'Review approved.' : 'Review hidden.')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not update review.', 'error')
    }
  }

  return (
    <section aria-labelledby="manage-reviews-title" data-manage-section="reviews">
      <ManagePageHeader
        title="Reviews"
        description="Approve or hide customer reviews before they show on product pages."
      />

      <ManageToolbar
        filters={[
          { value: '', label: 'All' },
          { value: '0', label: 'Pending' },
          { value: '1', label: 'Approved' },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-btn px-3.5 text-sm font-semibold transition-colors ${
              (approvedParam || '') === option.value
                ? 'bg-ink text-white'
                : 'border border-line bg-canvas hover:bg-subtle'
            }`}
          >
            {option.value === '1' ? <FaIcon icon="check" className="h-3 w-3" /> : null}
            {option.value === '0' ? <FaIcon icon="eye" className="h-3 w-3" /> : null}
            {option.label}
          </button>
        ))}
      />

      <Modal
        isOpen={Boolean(readingReview)}
        onClose={() => setReadingReview(null)}
        title={readingReview?.title || 'Review'}
        footer={
          <Button type="button" variant="outline" onClick={() => setReadingReview(null)}>
            Close
          </Button>
        }
      >
        {readingReview ? (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-ink">
              {readingReview.product_name} · {readingReview.rating}/5
            </p>
            <p className="text-xs text-muted">
              {readingReview.customer_email} · {formatDate(readingReview.created_at)}
            </p>
            {readingReview.title ? <p className="font-medium text-ink">{readingReview.title}</p> : null}
            {readingReview.body ? (
              <p className="whitespace-pre-wrap text-ink-soft">{readingReview.body}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {isLoading ? <Skeleton className="mt-4 h-48 w-full" /> : null}
      {error ? <ErrorMessage error={error} onRetry={reload} /> : null}
      {!isLoading && !error && reviews.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No reviews" message="Nothing in this filter." />
        </div>
      ) : null}

      {!isLoading && !error && reviews.length > 0 ? (
        <>
          <ul className="mt-4 space-y-3">
            {reviews.map((review) => {
              const body = review.body || ''
              const isLong = body.length > BODY_PREVIEW_LENGTH
              const preview = isLong ? `${body.slice(0, BODY_PREVIEW_LENGTH).trim()}…` : body

              return (
                <li key={review.id} className="manage-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <FaIcon icon="reviews" className="h-3.5 w-3.5 shrink-0 text-accent" />
                        {review.product_name} · {review.rating}/5
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {review.customer_email} · {formatDate(review.created_at)}
                      </p>
                      {review.title ? <p className="mt-2 text-sm font-medium text-ink">{review.title}</p> : null}
                      {body ? (
                        <div className="mt-1">
                          <p className="text-sm text-ink-soft">{preview}</p>
                          {isLong ? (
                            <button
                              type="button"
                              onClick={() => setReadingReview(review)}
                              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                            >
                              <FaIcon icon="eye" className="h-3 w-3" />
                              Read full review
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleApproval(review)}
                      className={`inline-flex min-h-10 items-center gap-1.5 rounded-btn px-3 text-xs font-semibold tracking-[0.04em] transition-colors ${
                        review.is_approved
                          ? 'border border-line hover:bg-subtle'
                          : 'bg-ink text-white hover:bg-ink-soft'
                      }`}
                    >
                      {review.is_approved ? (
                        <>
                          <FaIcon icon="eye" className="h-3 w-3" />
                          Hide
                        </>
                      ) : (
                        <>
                          <FaIcon icon="check" className="h-3 w-3" />
                          Approve
                        </>
                      )}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
        </>
      ) : null}
    </section>
  )
}
