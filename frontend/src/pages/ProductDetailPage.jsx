import { useState } from 'react'
import { useParams } from 'react-router'

import Breadcrumbs from '../components/common/Breadcrumbs'
import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import PriceDisplay from '../components/common/PriceDisplay'
import QuantitySelector from '../components/common/QuantitySelector'
import RatingDisplay from '../components/common/RatingDisplay'
import Skeleton from '../components/common/Skeleton'
import ProductGallery from '../components/products/ProductGallery'
import ReviewSection from '../components/products/ReviewSection'
import VariantSelector from '../components/products/VariantSelector'
import { useAddToCart } from '../hooks/useAddToCart'
import { useApi } from '../hooks/useApi'
import { catalogService } from '../services/catalogService'
import NotFoundPage from './NotFoundPage'

const MAX_QUANTITY_PER_ITEM = 10

function ProductDetailSkeleton() {
  return (
    <div className="page-container grid gap-8 py-10 md:grid-cols-2 lg:gap-14" aria-busy="true">
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}

function InfoSection({ title, content }) {
  if (!content) return null
  return (
    <details className="group border-b border-line py-1">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold tracking-widest uppercase">
        {title}
        <span aria-hidden="true" className="text-lg transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="prose-text pt-1 pb-4">{content}</p>
    </details>
  )
}

function ProductPurchasePanel({ product }) {
  const { addToCart, pendingVariantId } = useAddToCart()
  const defaultVariant = product.variants.find((variant) => variant.is_in_stock) ?? product.variants[0]
  const [selectedId, setSelectedId] = useState(defaultVariant?.id)
  const [quantity, setQuantity] = useState(1)
  const selectedVariant = product.variants.find((variant) => variant.id === selectedId) ?? defaultVariant

  if (!selectedVariant) {
    return <ErrorMessage message="This product is currently unavailable." />
  }

  const maxQuantity = Math.max(1, Math.min(MAX_QUANTITY_PER_ITEM, selectedVariant.stock_quantity))
  const isLowStock = selectedVariant.is_in_stock && selectedVariant.stock_quantity <= 5

  const handleSelectVariant = (variantId) => {
    setSelectedId(variantId)
    setQuantity(1)
  }

  return (
    <div className="space-y-6">
      <PriceDisplay price={selectedVariant.price} compareAtPrice={selectedVariant.compare_at_price} size="lg" />
      <p className="-mt-4 text-xs text-muted">Inclusive of all taxes</p>

      <VariantSelector variants={product.variants} selectedId={selectedVariant.id} onSelect={handleSelectVariant} />

      {selectedVariant.is_in_stock ? (
        <div className="space-y-3">
          {isLowStock && (
            <p className="text-sm font-medium text-warning">Hurry — only {selectedVariant.stock_quantity} left!</p>
          )}
          <div className="flex gap-3">
            <QuantitySelector value={quantity} onChange={setQuantity} max={maxQuantity} />
            <Button
              variant="accent"
              size="lg"
              className="flex-1"
              isLoading={pendingVariantId === selectedVariant.id}
              onClick={() => addToCart(selectedVariant.id, quantity, product.name)}
            >
              Add to bag
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-control bg-subtle p-3 text-sm font-medium">
          {selectedVariant.name} is sold out. Please choose another option.
        </p>
      )}
      <p className="text-xs break-all text-muted">SKU: {selectedVariant.sku}</p>
    </div>
  )
}

export default function ProductDetailPage() {
  const { slug } = useParams()
  const { data: product, isLoading, error, reload } = useApi(() => catalogService.getProduct(slug), [slug])

  if (isLoading) return <ProductDetailSkeleton />
  if (error?.response?.status === 404) return <NotFoundPage />
  if (error) {
    return (
      <div className="page-container py-10">
        <ErrorMessage error={error} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="page-container pb-10">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: product.category.name, to: `/shop?category=${product.category.slug}` },
          { label: product.name },
        ]}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:gap-8 md:grid-cols-2 lg:gap-14">
        <div className="min-w-0 lg:sticky lg:top-40 lg:self-start">
          <ProductGallery images={product.images} productName={product.name} />
        </div>
        <div className="min-w-0 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-widest text-muted uppercase">{product.brand.name}</p>
            <h1 className="text-xl font-semibold min-[400px]:text-2xl lg:text-3xl">{product.name}</h1>
            <RatingDisplay rating={product.average_rating} reviewCount={product.review_count} />
            {product.short_description && <p className="text-sm text-ink-soft">{product.short_description}</p>}
          </div>
          {/* key resets the selected shade when navigating to another product */}
          <ProductPurchasePanel key={product.id} product={product} />
          <div>
            <InfoSection title="Description" content={product.description} />
            <InfoSection title="Ingredients" content={product.ingredients} />
            <InfoSection title="How to use" content={product.how_to_use} />
          </div>
        </div>
      </div>
      <div className="mt-10 sm:mt-14">
        <ReviewSection product={product} />
      </div>
    </div>
  )
}
