import { discountPercent, formatPrice } from '../../utils/format'

const SIZE_CLASSES = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' }

export default function PriceDisplay({ price, compareAtPrice, size = 'md', prefix }) {
  const discount = discountPercent(price, compareAtPrice)
  return (
    <p className="flex flex-wrap items-baseline gap-2">
      <span className={`${SIZE_CLASSES[size]} font-semibold text-ink`}>
        {prefix && <span className="mr-1 text-xs font-normal text-muted">{prefix}</span>}
        {formatPrice(price)}
      </span>
      {discount > 0 && (
        <>
          <span className="text-sm text-muted line-through">
            <span className="sr-only">Original price </span>
            {formatPrice(compareAtPrice)}
          </span>
          <span className="text-xs font-semibold text-accent">{discount}% off</span>
        </>
      )}
    </p>
  )
}
