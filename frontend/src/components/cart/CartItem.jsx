import { Link } from 'react-router'

import { formatPrice } from '../../utils/format'
import ProductImage from '../common/ProductImage'
import QuantitySelector from '../common/QuantitySelector'

const MAX_QUANTITY_PER_ITEM = 10

export default function CartItem({ item, onQuantityChange, onRemove, isUpdating = false }) {
  const { variant } = item
  const maxQuantity = Math.min(MAX_QUANTITY_PER_ITEM, Math.max(variant.stock_quantity, item.quantity))
  const exceedsStock = item.quantity > variant.stock_quantity

  return (
    <li className={`flex gap-3 py-4 sm:gap-4 sm:py-5 ${isUpdating ? 'opacity-60' : ''}`}>
      <Link
        to={`/products/${variant.product_slug}`}
        className="h-20 w-20 shrink-0 overflow-hidden rounded-control border border-line bg-subtle sm:h-24 sm:w-24"
      >
        <ProductImage src={variant.image} alt={variant.product_name} className="h-full w-full" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[0.7rem] font-semibold tracking-widest text-muted uppercase">
              {variant.brand_name}
            </p>
            <Link to={`/products/${variant.product_slug}`} className="text-sm font-medium hover:text-accent">
              {variant.product_name}
            </Link>
            <p className="text-xs text-muted">{variant.name}</p>
          </div>
          <p className="shrink-0 text-sm font-semibold whitespace-nowrap">{formatPrice(item.line_total)}</p>
        </div>

        {!variant.is_available && (
          <p className="text-xs font-medium text-danger">This item is currently unavailable.</p>
        )}
        {variant.is_available && exceedsStock && (
          <p className="text-xs font-medium text-danger">Only {variant.stock_quantity} left — please reduce the quantity.</p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          <QuantitySelector
            value={item.quantity}
            max={maxQuantity}
            disabled={isUpdating}
            onChange={(quantity) => onQuantityChange(item.id, quantity)}
            label={`Quantity of ${variant.product_name}`}
          />
          <button
            type="button"
            onClick={() => onRemove(item)}
            disabled={isUpdating}
            className="-mr-2 min-h-11 px-2 text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}
