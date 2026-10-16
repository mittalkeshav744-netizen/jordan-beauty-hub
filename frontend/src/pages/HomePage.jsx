import { Link } from 'react-router'

import EmptyState from '../components/common/EmptyState'
import ErrorMessage from '../components/common/ErrorMessage'
import Reveal from '../components/common/Reveal'
import Skeleton from '../components/common/Skeleton'
import HeroSection from '../components/home/HeroSection'
import LooksShowcase from '../components/home/LooksShowcase'
import Marquee from '../components/home/Marquee'
import QuizPromo from '../components/home/QuizPromo'
import ShopByBudget from '../components/home/ShopByBudget'
import ShopByConcern from '../components/home/ShopByConcern'
import VideoReels from '../components/home/VideoReels'
import CategoryCard from '../components/products/CategoryCard'
import ProductGrid from '../components/products/ProductGrid'
import { useApi } from '../hooks/useApi'
import { catalogService } from '../services/catalogService'

const BENEFITS = [
  { title: 'Cash on delivery', text: 'Pay when your order arrives.' },
  { title: 'Genuine products', text: 'Sourced directly — never grey-market.' },
  { title: 'Easy cancellations', text: 'Cancel any order before it ships.' },
]

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
            <Reveal as="li" key={category.id} delay={50 * index} className="w-32 shrink-0 snap-start sm:w-36 lg:w-auto">
              <CategoryCard category={category} index={index} />
            </Reveal>
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
        <Reveal>
          <ProductGrid products={data?.results ?? []} isLoading={isLoading} skeletonCount={4} />
        </Reveal>
      )}
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Marquee />
      <section className="page-container py-8 sm:py-10">
        <h2 className="section-title mb-6 text-center">Shop by category</h2>
        <CategoryStrip />
      </section>
      <QuizPromo />
      <ProductSection title="Bestsellers" params={{ featured: 'true' }} viewAllLink="/shop?featured=true" />
      <VideoReels />
      <ShopByConcern />
      <LooksShowcase />
      <ShopByBudget />
      <ProductSection title="New arrivals" params={{ ordering: 'newest' }} viewAllLink="/shop" />
      <section className="bg-cream">
        <ul className="page-container grid gap-6 py-8 sm:grid-cols-3 sm:py-10">
          {BENEFITS.map((benefit, index) => (
            <Reveal as="li" key={benefit.title} delay={100 * index} className="text-center">
              <p className="text-sm font-semibold tracking-widest uppercase">{benefit.title}</p>
              <p className="mt-1 text-sm text-muted">{benefit.text}</p>
            </Reveal>
          ))}
        </ul>
      </section>
    </>
  )
}
