import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import ProductGrid from '../../components/products/ProductGrid'
import { useWishlist } from '../../hooks/useWishlist'

export default function WishlistPage() {
  const { products, count, isLoading, error, refreshWishlist } = useWishlist()

  if (error) return <ErrorMessage error={error} onRetry={refreshWishlist} />
  if (!isLoading && count === 0) {
    return (
      <EmptyState
        title="Your wishlist is empty"
        message="Tap the heart on any product to save it here for later."
        action={<Button to="/shop">Browse products</Button>}
      />
    )
  }

  return (
    <section aria-labelledby="wishlist-heading" className="space-y-4">
      <h2 id="wishlist-heading" className="text-sm font-semibold tracking-widest uppercase">
        Wishlist{!isLoading && <span className="ml-2 font-normal text-muted normal-case">({count} saved)</span>}
      </h2>
      <ProductGrid products={products} isLoading={isLoading} skeletonCount={3} />
    </section>
  )
}
