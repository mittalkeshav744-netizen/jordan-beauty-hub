import { useRef } from 'react'

import { useAddToCart } from '../../hooks/useAddToCart'
import ScrollRowNav from '../common/ScrollRowNav'
import Skeleton from '../common/Skeleton'
import ProductCard from './ProductCard'

/**
 * Horizontal product shelf using the shared ProductCard.
 * Exactly 2 / 3 / 5 full cards fit the row (no half-peek of the next).
 * Previous/Next when more products overflow.
 */
const ITEM_CLASSES = [
  'shrink-0 snap-start',
  'w-[calc((100cqw-0.625rem)/2)]',
  'sm:w-[calc((100cqw-1rem)/2)]',
  'md:w-[calc((100cqw-2rem)/3)]',
  'xl:w-[calc((100cqw-4rem)/5)]',
].join(' ')

const ROW_CLASSES =
  'scrollbar-hide flex w-full min-w-0 max-w-full snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 sm:gap-4 sm:pb-2'

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

export default function ProductScrollRow({
  products = [],
  isLoading = false,
  skeletonCount = 5,
  ariaLabel = 'Products',
}) {
  const scrollerRef = useRef(null)
  const { addToCart, pendingVariantId } = useAddToCart()
  const contentKey = isLoading ? `skel-${skeletonCount}` : `items-${products.length}`

  return (
    <div className="product-scroll-row @container w-full min-w-0 max-w-full space-y-3 [container-type:inline-size]">
      <div className="flex justify-end empty:hidden">
        <ScrollRowNav scrollerRef={scrollerRef} contentKey={contentKey} />
      </div>

      <ul
        ref={scrollerRef}
        className={ROW_CLASSES}
        aria-busy={isLoading || undefined}
        aria-label={isLoading ? `Loading ${ariaLabel.toLowerCase()}` : ariaLabel}
      >
        {isLoading
          ? Array.from({ length: skeletonCount }, (_, index) => (
              <li key={`skel-${index}`} className={ITEM_CLASSES}>
                <ProductCardSkeleton />
              </li>
            ))
          : products.map((product) => (
              <li key={product.id} className={ITEM_CLASSES}>
                <ProductCard
                  product={product}
                  onAddToCart={addToCart}
                  isAdding={isProductAdding(product, pendingVariantId)}
                />
              </li>
            ))}
      </ul>
    </div>
  )
}
