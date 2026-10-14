const STARS = [1, 2, 3, 4, 5]

export default function RatingDisplay({ rating, reviewCount, size = 'sm' }) {
  if (!rating) {
    return reviewCount === undefined ? null : <p className="text-xs text-muted">No reviews yet</p>
  }
  const rounded = Math.round(rating * 10) / 10
  const starSize = size === 'lg' ? 'text-lg' : 'text-sm'

  return (
    <p className="flex items-center gap-1.5" aria-label={`Rated ${rounded} out of 5`}>
      <span aria-hidden="true" className={`${starSize} tracking-tight`}>
        {STARS.map((star) => (
          <span key={star} className={star <= Math.round(rating) ? 'text-accent' : 'text-line'}>
            ★
          </span>
        ))}
      </span>
      <span className="text-xs text-muted">
        {rounded}
        {reviewCount !== undefined && ` (${reviewCount})`}
      </span>
    </p>
  )
}
