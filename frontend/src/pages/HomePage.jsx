import { Link } from 'react-router'

import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import ErrorMessage from '../components/common/ErrorMessage'
import Skeleton from '../components/common/Skeleton'
import CategoryCard from '../components/products/CategoryCard'
import ProductGrid from '../components/products/ProductGrid'
import { useApi } from '../hooks/useApi'
import { catalogService } from '../services/catalogService'

const BENEFITS = [
  { title: 'Cash on delivery', text: 'Pay when your order arrives.' },
  { title: 'Genuine products', text: 'Sourced directly — never grey-market.' },
  { title: 'Easy cancellations', text: 'Cancel any order before it ships.' },
]

function HeroBanner() {
  return (
    <section className="bg-ink text-white">
      <div className="page-container grid items-center gap-8 py-10 sm:py-14 md:grid-cols-2 lg:py-20">
        <div className="space-y-5">
          <p className="text-xs font-semibold tracking-[0.3em] text-accent uppercase">New season edit</p>
          <h1 className="text-display font-bold uppercase">
            Bold colour.
            <br />
            Zero compromise.
          </h1>
          <p className="max-w-md text-sm text-white/75 sm:text-base">
            Long-wear makeup and skin-loving care, made for Indian skin tones and every day.
          </p>
          <div className="grid grid-cols-2 gap-3 min-[480px]:flex min-[480px]:flex-wrap">
            <Button variant="accent" size="lg" to="/shop" className="px-4 sm:px-7">
              Shop now
            </Button>
            <Button
              size="lg"
              to="/shop?featured=true"
              className="border border-white bg-transparent px-4 hover:bg-white hover:text-ink sm:px-7"
            >
              Bestsellers
            </Button>
          </div>
        </div>
        {/* Replace with a campaign image once brand photography is supplied. */}
        <div
          aria-hidden="true"
          className="hidden aspect-[4/3] items-center justify-center rounded-card bg-accent md:flex"
        >
          <span className="text-8xl font-bold tracking-tighter">JBH</span>
        </div>
      </div>
    </section>
  )
}

function CategoryStrip() {
  const { data: categories, isLoading, error, reload } = useApi(() => catalogService.getCategories())

  if (error) return <ErrorMessage error={error} onRetry={reload} />
  if (!isLoading && categories.length === 0) {
    return <EmptyState title="Coming soon" message="Categories will appear here shortly." />
  }
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:thin] sm:-mx-6 sm:gap-4 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] lg:overflow-visible lg:px-0">
      {isLoading
        ? Array.from({ length: 7 }, (_, index) => (
            <li key={index} className="w-32 shrink-0 sm:w-36 lg:w-auto">
              <Skeleton className="aspect-square rounded-card" />
            </li>
          ))
        : categories.map((category, index) => (
            <li key={category.id} className="w-32 shrink-0 snap-start sm:w-36 lg:w-auto">
              <CategoryCard category={category} index={index} />
            </li>
          ))}
    </ul>
  )
}

function ProductSection({ title, params, viewAllLink }) {
  const { data, isLoading, error, reload } = useApi(
    () => catalogService.getProducts({ page_size: 8, ...params }),
    [params],
  )

  return (
    <section className="page-container space-y-5 py-8 sm:space-y-6 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <h2 className="section-title">{title}</h2>
        <Link
          to={viewAllLink}
          className="-my-2 shrink-0 py-2 text-xs font-semibold tracking-widest whitespace-nowrap text-accent uppercase hover:underline"
        >
          View all
        </Link>
      </div>
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {!error && !isLoading && data.results.length === 0 && (
        <EmptyState title="Coming soon" message="New products are on their way." />
      )}
      {!error && (isLoading || data.results.length > 0) && (
        <ProductGrid products={data?.results ?? []} isLoading={isLoading} skeletonCount={4} />
      )}
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <section className="page-container py-8 sm:py-10">
        <h2 className="section-title mb-6 text-center">Shop by category</h2>
        <CategoryStrip />
      </section>
      <ProductSection title="Bestsellers" params={{ featured: 'true' }} viewAllLink="/shop?featured=true" />
      <section className="bg-cream">
        <ul className="page-container grid gap-6 py-8 sm:grid-cols-3 sm:py-10">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title} className="text-center">
              <p className="text-sm font-semibold tracking-widest uppercase">{benefit.title}</p>
              <p className="mt-1 text-sm text-muted">{benefit.text}</p>
            </li>
          ))}
        </ul>
      </section>
      <ProductSection title="New arrivals" params={{ ordering: 'newest' }} viewAllLink="/shop" />
    </>
  )
}
