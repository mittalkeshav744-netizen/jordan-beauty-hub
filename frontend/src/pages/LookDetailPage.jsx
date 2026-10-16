import { useParams } from 'react-router'

import Breadcrumbs from '../components/common/Breadcrumbs'
import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import Skeleton from '../components/common/Skeleton'
import StepProductCard from '../components/products/StepProductCard'
import { useAddManyToCart } from '../hooks/useAddManyToCart'
import { useApi } from '../hooks/useApi'
import { looksService } from '../services/looksService'
import { formatPrice } from '../utils/format'
import NotFoundPage from './NotFoundPage'

const COLLAGE_SIZE = 4

function LookMedia({ look }) {
  if (look.video) {
    return (
      <figure className="overflow-hidden rounded-card bg-ink">
        <video
          className="aspect-[4/5] w-full object-cover sm:aspect-video lg:aspect-[4/5]"
          src={look.video}
          poster={look.cover_image ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          controls
          aria-label={`Video: ${look.title}`}
        />
      </figure>
    )
  }
  if (look.cover_image) {
    return <img src={look.cover_image} alt="" className="aspect-[4/5] w-full rounded-card object-cover" />
  }
  const images = [...new Set(look.steps.map((step) => step.product.primary_image?.image).filter(Boolean))].slice(
    0,
    COLLAGE_SIZE,
  )
  return (
    <div aria-hidden="true" className="relative isolate overflow-hidden rounded-card bg-ink">
      {images.length > 0 ? (
        <div className="grid aspect-[4/3] grid-cols-2 gap-1 lg:aspect-[4/5]">
          {images.map((src, index) => (
            <img
              key={src}
              src={src}
              alt=""
              className={`h-full w-full object-cover ${images.length === 3 && index === 0 ? 'row-span-2' : ''} ${
                images.length === 1 ? 'col-span-2' : ''
              }`}
            />
          ))}
        </div>
      ) : (
        <div className="aspect-[4/3] lg:aspect-[4/5]">
          <span className="absolute -top-10 -left-10 -z-10 h-48 w-48 animate-blob rounded-full bg-accent/50 blur-3xl" />
          <span className="absolute -right-10 -bottom-10 -z-10 h-56 w-56 animate-blob rounded-full bg-tile-orchid-deep/50 blur-3xl [animation-delay:-6s]" />
        </div>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/85 to-transparent px-6 pt-16 pb-6 font-display text-3xl font-bold text-white uppercase">
        {look.occasion || look.title}
      </span>
    </div>
  )
}

function stepNote(step) {
  const shade = step.variant ? `Shade: ${step.variant.name}${step.variant.is_in_stock ? '' : ' (sold out)'}` : ''
  return [shade, step.instruction].filter(Boolean).join(' — ')
}

export default function LookDetailPage() {
  const { slug } = useParams()
  const { data: look, isLoading, error, reload } = useApi(() => looksService.get(slug), [slug])
  const { addMany, isAdding } = useAddManyToCart()

  if (error?.response?.status === 404) return <NotFoundPage />

  return (
    <div className="page-container pb-12">
      <Breadcrumbs
        items={[{ label: 'Home', to: '/' }, { label: 'Get the look', to: '/looks' }, { label: look?.title ?? 'Look' }]}
      />
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {isLoading && (
        <div aria-label="Loading look" className="grid gap-8 py-6 lg:grid-cols-2">
          <Skeleton className="aspect-[4/5] rounded-card" />
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-card" />
            ))}
          </div>
        </div>
      )}
      {look && !isLoading && (
        <div className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
          <div className="animate-fade-up lg:sticky lg:top-40 lg:self-start">
            <LookMedia look={look} />
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              {look.occasion && (
                <p className="text-xs font-semibold tracking-[0.3em] text-accent uppercase">{look.occasion}</p>
              )}
              <h1 className="font-display text-3xl font-bold sm:text-4xl">{look.title}</h1>
              {look.description && <p className="text-ink-soft">{look.description}</p>}
            </div>

            <section aria-labelledby="steps-heading" className="space-y-3">
              <h2 id="steps-heading" className="text-sm font-semibold tracking-[0.2em] uppercase">
                How to get this look
              </h2>
              <ol className="space-y-3">
                {look.steps.map((step, index) => (
                  <StepProductCard
                    key={step.id}
                    number={index + 1}
                    product={step.product}
                    price={step.variant?.price}
                    note={stepNote(step)}
                  />
                ))}
              </ol>
            </section>

            <div className="flex flex-col gap-4 rounded-card bg-cream p-5 sm:flex-row sm:items-center sm:justify-between">
              {look.bag_variant_ids.length > 0 ? (
                <>
                  <div>
                    <p className="text-sm text-muted">
                      {look.bag_variant_ids.length} product{look.bag_variant_ids.length === 1 ? '' : 's'} in stock
                    </p>
                    <p className="font-display text-2xl font-bold">{formatPrice(look.total_price)}</p>
                  </div>
                  <Button
                    variant="accent"
                    size="lg"
                    isLoading={isAdding}
                    onClick={() => addMany(look.bag_variant_ids, look.title)}
                  >
                    Add the full look to bag
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted">Everything in this look is sold out right now. Please check back soon.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
