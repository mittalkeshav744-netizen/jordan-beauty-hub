import { useAddToCart } from '../../hooks/useAddToCart'
import Skeleton from '../common/Skeleton'
import ProductCard from './ProductCard'

const GRID_CLASSES = 'grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 xl:grid-cols-4 2xl:gap-6'

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-1.5 border-t border-line p-2.5 sm:p-3">
        <Skeleton className="h-2.5 w-1/3" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-8 w-full sm:h-9" />
      </div>
    </div>
  )
}

function isProductAdding(product, pendingVariantId) {
  if (pendingVariantId == null) return false
  if (pendingVariantId === product.default_variant_id) return true
  return (product.card_variants || []).some((variant) => variant.id === pendingVariantId)
}

export default function ProductGrid({ products, isLoading, skeletonCount = 8 }) {
  const { addToCart, pendingVariantId } = useAddToCart()

  if (isLoading) {
    return (
      <div className={GRID_CLASSES} aria-busy="true" aria-label="Loading products">
        {Array.from({ length: skeletonCount }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <div className={GRID_CLASSES}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={addToCart}
          isAdding={isProductAdding(product, pendingVariantId)}
        />
      ))}
    </div>
  )
}
