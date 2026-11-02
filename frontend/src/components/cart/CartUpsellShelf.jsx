import { Link } from 'react-router'

import { useAddToCart } from '../../hooks/useAddToCart'
import { useApi } from '../../hooks/useApi'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { catalogService } from '../../services/catalogService'
import { formatPrice } from '../../utils/format'
import Button from '../common/Button'
import PriceDisplay from '../common/PriceDisplay'
import ProductImage from '../common/ProductImage'
import Skeleton from '../common/Skeleton'

export default function CartUpsellShelf({ subtotal }) {
  const settings = useStoreSettings()
  const freeShippingThreshold = Number(settings?.free_shipping_threshold ?? 0)
  const numericSubtotal = Number(subtotal) || 0
  const isNearFreeShipping =
    freeShippingThreshold > 0 && numericSubtotal > 0 && numericSubtotal < freeShippingThreshold
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - numericSubtotal)

  const { data: products, isLoading, error } = useApi(
    () => catalogService.getRecommendations({ context: 'cart', subtotal: numericSubtotal }),
    [numericSubtotal],
  )
  const { addToCart, pendingVariantId } = useAddToCart()

  if (error || (!isLoading && (!products || products.length === 0))) {
    return null
  }

  return (
    <section aria-labelledby="cart-upsell-heading" className="mt-8 pt-8 border-t border-line space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <div className="flex items-center gap-1.5">
            {isNearFreeShipping && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                Add {formatPrice(remainingForFreeShipping)} for free delivery
              </span>
            )}
          </div>
          <h2 id="cart-upsell-heading" className="font-display text-lg font-bold text-ink sm:text-xl">
            {isNearFreeShipping ? 'Add a little more for free delivery' : 'You may also like'}
          </h2>
          <p className="text-xs text-muted">
            Easy add-ons that pair well with what is already in your bag.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-card border border-line p-3 space-y-2">
              <Skeleton className="aspect-square w-full rounded-control" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {products.slice(0, 4).map((product) => {
            const productUrl = `/products/${product.slug}`
            const canQuickAdd = product.is_in_stock && product.default_variant_id
            const isAdding = pendingVariantId === product.default_variant_id

            return (
              <article
                key={product.id}
                className="flex flex-col rounded-card border border-line bg-surface p-3 transition-shadow duration-200 hover:shadow-card"
              >
                <Link to={productUrl} className="block aspect-square overflow-hidden rounded-control bg-subtle">
                  <ProductImage
                    src={product.primary_image?.image}
                    alt={product.primary_image?.alt_text || product.name}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </Link>

                <div className="mt-2 flex flex-1 flex-col justify-between">
                  <div>
                    <p className="text-[0.65rem] font-semibold tracking-wider text-muted uppercase truncate">
                      {product.brand?.name}
                    </p>
                    <h3 className="line-clamp-2 text-xs font-medium text-ink hover:text-accent">
                      <Link to={productUrl}>{product.name}</Link>
                    </h3>
                  </div>

                  <div className="mt-2 space-y-2">
                    <PriceDisplay price={product.min_price} compareAtPrice={product.min_compare_at_price} />
                    {canQuickAdd ? (
                      <Button
                        size="sm"
                        variant="outline"
                        fullWidth
                        isLoading={isAdding}
                        onClick={() => addToCart(product.default_variant_id, 1, product.name)}
                        className="text-xs py-1.5"
                      >
                        + Add to bag
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" fullWidth to={productUrl} className="text-xs py-1.5">
                        View options
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
