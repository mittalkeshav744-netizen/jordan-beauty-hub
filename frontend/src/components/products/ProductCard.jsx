import { Link } from 'react-router'

import Button from '../common/Button'
import PriceDisplay from '../common/PriceDisplay'
import ProductImage from '../common/ProductImage'
import RatingDisplay from '../common/RatingDisplay'

/**
 * Product tile. Products with several shades/sizes link to the detail page
 * to choose one; single-variant products can be added straight to the bag.
 */
export default function ProductCard({ product, onAddToCart, isAdding = false }) {
  const productUrl = `/products/${product.slug}`
  const hasChoices = product.variant_count > 1
  const canQuickAdd = product.is_in_stock && !hasChoices && product.default_variant_id

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface transition-shadow duration-200 hover:shadow-card">
      <Link to={productUrl} className="relative block aspect-square overflow-hidden bg-subtle">
        <ProductImage
          src={product.primary_image?.image}
          alt={product.primary_image?.alt_text || product.name}
          className="h-full w-full transition-transform duration-300 ease-standard group-hover:scale-105"
        />
        {!product.is_in_stock && (
          <span className="absolute top-2 left-2 rounded-control bg-ink px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-white uppercase sm:top-3 sm:left-3 sm:px-2 sm:py-1 sm:text-[0.65rem]">
            Sold out
          </span>
        )}
        {product.is_in_stock && product.is_featured && (
          <span className="absolute top-2 left-2 rounded-control bg-accent px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-white uppercase sm:top-3 sm:left-3 sm:px-2 sm:py-1 sm:text-[0.65rem]">
            Bestseller
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <p className="truncate text-[0.65rem] font-semibold tracking-widest text-muted uppercase sm:text-[0.7rem]">
          {product.brand.name}
        </p>
        <h3 className="line-clamp-2 text-sm font-medium">
          <Link to={productUrl} className="hover:text-accent">
            {product.name}
          </Link>
        </h3>
        <RatingDisplay rating={product.average_rating} reviewCount={product.review_count} />
        {hasChoices && <p className="text-xs text-muted">{product.variant_count} shades / sizes</p>}
        <div className="mt-auto pt-2">
          <PriceDisplay
            price={product.min_price}
            compareAtPrice={product.min_compare_at_price}
            prefix={hasChoices ? 'From' : undefined}
          />
        </div>
        {canQuickAdd ? (
          <Button
            size="sm"
            fullWidth
            className="px-2 sm:px-3"
            isLoading={isAdding}
            onClick={() => onAddToCart(product.default_variant_id, 1, product.name)}
          >
            Add to bag
          </Button>
        ) : (
          <Button size="sm" variant="outline" fullWidth to={productUrl} className="px-2 sm:px-3">
            {product.is_in_stock ? 'Choose shade' : 'View details'}
          </Button>
        )}
      </div>
    </article>
  )
}
