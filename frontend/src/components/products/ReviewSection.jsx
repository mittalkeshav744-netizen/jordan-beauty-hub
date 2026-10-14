import { useState } from 'react'
import { Link } from 'react-router'

import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { useForm } from '../../hooks/useForm'
import { useToast } from '../../hooks/useToast'
import { catalogService } from '../../services/catalogService'
import { formatDate } from '../../utils/format'
import Button from '../common/Button'
import ErrorMessage from '../common/ErrorMessage'
import RatingDisplay from '../common/RatingDisplay'
import Skeleton from '../common/Skeleton'
import FormField from '../forms/FormField'

const RATING_OPTIONS = [5, 4, 3, 2, 1]

function ReviewForm({ slug, onCreated, onCancel }) {
  const { showToast } = useToast()
  const form = useForm({ rating: '', title: '', body: '' }, (values) => ({
    rating: values.rating ? '' : 'Please choose a rating.',
  }))

  const submit = async (values) => {
    const review = await catalogService.createReview(slug, { ...values, rating: Number(values.rating) })
    showToast('Thank you for your review!')
    onCreated(review)
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-4 rounded-card border border-line p-4 sm:p-5">
      {form.formError && <ErrorMessage message={form.formError} />}
      <FormField label="Rating" as="select" required {...form.field('rating')}>
        <option value="">Choose a rating</option>
        {RATING_OPTIONS.map((rating) => (
          <option key={rating} value={rating}>
            {rating} star{rating > 1 ? 's' : ''}
          </option>
        ))}
      </FormField>
      <FormField label="Title" maxLength={120} {...form.field('title')} />
      <FormField label="Your review" as="textarea" {...form.field('body')} />
      <div className="flex gap-3">
        <Button type="submit" isLoading={form.isSubmitting}>
          Submit review
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default function ReviewSection({ product }) {
  const { isAuthenticated } = useAuth()
  const [isWriting, setIsWriting] = useState(false)
  const { data, isLoading, error, reload } = useApi(
    () => catalogService.getReviews(product.slug),
    [product.slug],
  )

  const handleCreated = () => {
    setIsWriting(false)
    reload()
  }

  return (
    <section aria-labelledby="reviews-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="reviews-heading" className="section-title">
            Reviews
          </h2>
          <div className="mt-2">
            <RatingDisplay rating={product.average_rating} reviewCount={product.review_count} size="lg" />
          </div>
        </div>
        {!isWriting &&
          (isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={() => setIsWriting(true)}>
              Write a review
            </Button>
          ) : (
            <Link to="/login" className="text-sm text-accent hover:underline">
              Sign in to write a review
            </Link>
          ))}
      </div>

      {isWriting && (
        <>
          <p className="text-xs text-muted">Reviews are open to customers whose order has been delivered.</p>
          <ReviewForm slug={product.slug} onCreated={handleCreated} onCancel={() => setIsWriting(false)} />
        </>
      )}

      {isLoading && <Skeleton className="h-24 w-full" />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {data && data.results.length === 0 && (
        <p className="text-sm text-muted">No reviews yet. Be the first to share your thoughts.</p>
      )}
      {data && data.results.length > 0 && (
        <ul className="divide-y divide-line">
          {data.results.map((review) => (
            <li key={review.id} className="space-y-1 py-4">
              <RatingDisplay rating={review.rating} />
              {review.title && <p className="font-medium">{review.title}</p>}
              {review.body && <p className="prose-text">{review.body}</p>}
              <p className="text-xs text-muted">
                {review.author_name} · {formatDate(review.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
