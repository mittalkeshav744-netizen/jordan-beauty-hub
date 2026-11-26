import { useLocation } from 'react-router'

import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import ProductGrid from '../../components/products/ProductGrid'
import { useAuth } from '../../hooks/useAuth'
import { useWishlist } from '../../hooks/useWishlist'

export default function WishlistPage() {
  const { pathname } = useLocation()
  const { isAuthenticated } = useAuth()
  const { products, count, isLoading, error, refreshWishlist } = useWishlist()
  const standalone = pathname === '/wishlist'

  if (error) {
    const errorBlock = <ErrorMessage error={error} onRetry={refreshWishlist} />
    return standalone ? (
      <div className="page-container py-5 sm:py-8">{errorBlock}</div>
    ) : (
      errorBlock
    )
  }

  if (!isLoading && count === 0) {
    const empty = (
      <EmptyState
        title="Your wishlist is empty"
        message="Tap the heart on any product to save it here for later."
        action={<Button to="/shop">Browse products</Button>}
      />
    )
    return standalone ? <div className="page-container py-5 sm:py-8">{empty}</div> : empty
  }

  const heading = standalone ? (
    <h1 id="wishlist-heading" className="section-title">
      Wishlist
      {!isLoading && <span className="ml-2 text-sm font-normal tracking-normal text-muted normal-case">({count} saved)</span>}
    </h1>
  ) : (
    <h2 id="wishlist-heading" className="text-sm font-semibold tracking-widest uppercase">
      Wishlist
      {!isLoading && <span className="ml-2 font-normal text-muted normal-case">({count} saved)</span>}
    </h2>
  )

  const content = (
    <section aria-labelledby="wishlist-heading" className="space-y-4">
      {heading}
      {!isAuthenticated && count > 0 ? (
        <p className="text-xs text-muted">
          Saved on this device. Sign in anytime to keep your wishlist across phones.
        </p>
      ) : null}
      <ProductGrid products={products} isLoading={isLoading} skeletonCount={3} />
    </section>
  )

  return standalone ? <div className="page-container py-5 sm:py-8">{content}</div> : content
}
