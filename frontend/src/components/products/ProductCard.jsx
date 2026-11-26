import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'

import { formatPrice } from '../../utils/format'
import Button from '../common/Button'
import PriceDisplay from '../common/PriceDisplay'
import ProductImage from '../common/ProductImage'
import TruncateWithTooltip from '../common/TruncateWithTooltip'
import WishlistButton from './WishlistButton'

function cardVariantsOf(product) {
  if (Array.isArray(product.card_variants) && product.card_variants.length > 0) {
    return product.card_variants
  }
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants
  }
  return []
}

function variantSnapshot(product, variant) {
  if (!variant) return null
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku || '',
    price: variant.price,
    compare_at_price: variant.compare_at_price ?? null,
    stock_quantity: variant.stock_quantity ?? (variant.is_in_stock ? 99 : 0),
    product_name: product.name,
    product_slug: product.slug,
    brand_name: product.brand?.name || '',
    image: product.primary_image?.image || null,
    is_available: variant.is_in_stock !== false,
  }
}

/** Drop leading shade codes like "01 " so the UI shows colour, not the number. */
function shadeLabel(name) {
  const cleaned = String(name || '')
    .replace(/^\d+\s*[.\-:]?\s*/u, '')
    .trim()
  return cleaned || name || 'Shade'
}

function CompactRating({ rating }) {
  if (!rating) return null
  const rounded = Math.round(Number(rating) * 10) / 10
  return (
    <span
      className="inline-flex shrink-0 items-center gap-0.5 text-[0.7rem] font-semibold tabular-nums text-ink-soft sm:text-xs"
      aria-label={`Rated ${rounded} out of 5`}
    >
      <span className="tabular-nums">{rounded}</span>
      <span aria-hidden="true" className="text-accent">
        ★
      </span>
    </span>
  )
}

function ShadePicker({ variants, resolvedId, onSelect, productName }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const listId = useId()
  const selected = variants.find((item) => item.id === resolvedId) || variants[0]
  const selectedHex = selected?.shade_hex || ''

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Choose shade for ${productName}${selected ? `: ${shadeLabel(selected.name)}` : ''}`}
        title={selected ? shadeLabel(selected.name) : 'Choose shade'}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-btn border border-line shadow-[inset_0_0_0_1px_rgb(17_17_17/0.06)] transition-[transform,box-shadow] hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{
          backgroundColor: selectedHex || 'var(--color-subtle)',
          color: selectedHex ? '#fff' : 'var(--color-ink)',
        }}
      >
        {!selectedHex ? (
          <span className="text-[0.65rem] font-bold tracking-wide">
            {(shadeLabel(selected?.name) || 'S').slice(0, 1)}
          </span>
        ) : null}
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={`Shades for ${productName}`}
          className="absolute right-0 bottom-full z-30 mb-1 max-h-52 min-w-[11rem] overflow-auto rounded-control border border-line bg-surface py-1 shadow-raised"
        >
          {variants.map((variant) => {
            const active = variant.id === resolvedId
            const hex = variant.shade_hex || ''
            return (
              <li key={variant.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={!variant.is_in_stock}
                  onClick={() => {
                    onSelect(variant.id)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40 ${
                    active ? 'bg-accent-soft font-semibold text-accent' : 'text-ink'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 rounded-full border border-line shadow-[inset_0_0_0_1px_rgb(17_17_17/0.08)]"
                    style={{ backgroundColor: hex || 'var(--color-subtle)' }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {shadeLabel(variant.name)}
                    {!variant.is_in_stock ? ' (sold out)' : ''}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {formatPrice(variant.price)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Shared storefront product tile — used by ProductGrid, ProductScrollRow, and shelves.
 * Multi-shade cards pick a colour swatch beside Add to bag; default shade is used if untouched.
 */
export default function ProductCard({ product, onAddToCart, isAdding = false }) {
  const productUrl = `/products/${product.slug}`
  const variants = cardVariantsOf(product)
  const hasChoices = variants.length > 1 || product.variant_count > 1
  const defaultId =
    product.default_variant_id || variants.find((item) => item.is_in_stock)?.id || variants[0]?.id
  const [selectedId, setSelectedId] = useState(null)

  const resolvedId = selectedId ?? defaultId
  const selectedVariant = variants.find((item) => item.id === resolvedId) || null
  const displayPrice = selectedVariant?.price ?? product.min_price
  const displayCompare = selectedVariant?.compare_at_price ?? product.min_compare_at_price
  const canAdd = product.is_in_stock && resolvedId

  const handleAdd = () => {
    if (!resolvedId) return
    onAddToCart(resolvedId, 1, product.name, variantSnapshot(product, selectedVariant))
  }

  return (
    <article className="group relative flex min-w-0 flex-col rounded-card border border-line bg-surface shadow-card transition-[box-shadow,transform] duration-300 ease-standard hover:-translate-y-0.5 hover:shadow-raised focus-within:-translate-y-0.5 focus-within:shadow-raised">
      <div className="relative overflow-hidden rounded-t-[inherit] border-b border-line">
        <Link
          to={productUrl}
          className="relative block aspect-square overflow-hidden bg-subtle shadow-[inset_0_0_0_1px_var(--color-line)]"
        >
          <ProductImage
            src={product.primary_image?.image}
            alt={product.primary_image?.alt_text || product.name}
            className="h-full w-full object-cover transition-transform duration-300 ease-standard group-hover:scale-105"
          />
        </Link>
        {!product.is_in_stock && (
          <span className="pointer-events-none absolute top-2 left-2 rounded-control bg-ink px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-white uppercase sm:top-2.5 sm:left-2.5 sm:px-2 sm:text-[0.65rem]">
            Sold out
          </span>
        )}
        {product.is_in_stock && product.is_featured && (
          <span className="pointer-events-none absolute top-2 left-2 rounded-control bg-accent px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-white uppercase sm:top-2.5 sm:left-2.5 sm:px-2 sm:text-[0.65rem]">
            Bestseller
          </span>
        )}
        <WishlistButton product={product} className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5" />
      </div>

      <div className="flex flex-col gap-1.5 p-2.5 sm:p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 text-xs font-medium leading-snug sm:text-sm">
            <TruncateWithTooltip as={Link} to={productUrl} text={product.name} className="block hover:text-accent" />
          </h3>
          <CompactRating rating={product.average_rating} />
        </div>

        <PriceDisplay price={displayPrice} compareAtPrice={displayCompare} />

        {product.is_in_stock && hasChoices ? (
          <div className="flex items-stretch gap-1.5">
            <Button
              size="sm"
              className="min-w-0 flex-1 px-1.5 sm:px-3"
              isLoading={isAdding}
              disabled={!canAdd}
              onClick={handleAdd}
            >
              Add to bag
            </Button>
            <ShadePicker
              variants={variants}
              resolvedId={resolvedId}
              productName={product.name}
              onSelect={setSelectedId}
            />
          </div>
        ) : canAdd ? (
          <Button size="sm" fullWidth className="px-1.5 sm:px-3" isLoading={isAdding} onClick={handleAdd}>
            Add to bag
          </Button>
        ) : (
          <Button size="sm" variant="outline" fullWidth to={productUrl} className="px-1.5 sm:px-3">
            View details
          </Button>
        )}
      </div>
    </article>
  )
}
