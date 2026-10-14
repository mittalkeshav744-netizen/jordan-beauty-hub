import { useAddToCart } from '../../hooks/useAddToCart'
import Skeleton from '../common/Skeleton'
import ProductCard from './ProductCard'

const GRID_CLASSES = 'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4 2xl:gap-6'

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-3 sm:p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
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
          isAdding={pendingVariantId === product.default_variant_id}
        />
      ))}
    </div>
  )
}
