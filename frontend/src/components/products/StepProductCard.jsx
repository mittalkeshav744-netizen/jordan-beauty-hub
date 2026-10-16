import { Link } from 'react-router'

import PriceDisplay from '../common/PriceDisplay'
import ProductImage from '../common/ProductImage'

/**
 * One numbered step of a routine or look: product photo, name, price and an optional note.
 * Without a product it shows a "no match yet" placeholder.
 */
export default function StepProductCard({ number, label, product, price, note }) {
  return (
    <li className="flex gap-4 rounded-card border border-line bg-surface p-3 shadow-card sm:p-4">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-white"
      >
        {number}
      </span>
      <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
        {product ? (
          <Link
            to={`/products/${product.slug}`}
            className="block h-20 w-20 shrink-0 overflow-hidden rounded-control bg-subtle sm:h-24 sm:w-24"
          >
            <ProductImage
              src={product.primary_image?.image}
              alt={product.primary_image?.alt_text || product.name}
              className="h-full w-full transition-transform duration-300 hover:scale-105"
            />
          </Link>
        ) : (
          <div aria-hidden="true" className="h-20 w-20 shrink-0 rounded-control bg-subtle sm:h-24 sm:w-24" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          {label && <p className="text-[0.65rem] font-semibold tracking-widest text-accent uppercase">{label}</p>}
          {product ? (
            <>
              <h3 className="line-clamp-2 text-sm font-medium">
                <Link to={`/products/${product.slug}`} className="hover:text-accent">
                  {product.name}
                </Link>
              </h3>
              <PriceDisplay size="sm" price={price ?? product.min_price} compareAtPrice={price ? null : product.min_compare_at_price} />
            </>
          ) : (
            <p className="text-sm text-muted">No match yet — we are adding more products soon.</p>
          )}
          {note && <p className="text-xs text-ink-soft">{note}</p>}
        </div>
      </div>
    </li>
  )
}
