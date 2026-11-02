import { Link } from 'react-router'

import EmptyState from '../components/common/EmptyState'
import ErrorMessage from '../components/common/ErrorMessage'
import Reveal from '../components/common/Reveal'
import Skeleton from '../components/common/Skeleton'
import HeroSection from '../components/home/HeroSection'
import LooksShowcase from '../components/home/LooksShowcase'
import Marquee from '../components/home/Marquee'
import CuratedHomeShelf from '../components/home/CuratedHomeShelf'
import PersonalizedShelf from '../components/home/PersonalizedShelf'
import QuizPromo from '../components/home/QuizPromo'
import ShopByBudget from '../components/home/ShopByBudget'
import ShopByConcern from '../components/home/ShopByConcern'
import VideoReels from '../components/home/VideoReels'
import CategoryCard from '../components/products/CategoryCard'
import ProductGrid from '../components/products/ProductGrid'
import { useApi } from '../hooks/useApi'
import { useStorefront } from '../hooks/useStorefront'
import { catalogService } from '../services/catalogService'
import { FEATURED_CATEGORY_LIMIT, topCategories } from '../utils/categories'

const DEFAULT_BENEFITS = [
  { title: 'Cash on delivery', text: 'Pay when your order arrives.' },
  { title: 'Genuine products', text: 'Sourced directly — never grey-market.' },
  { title: 'Easy cancellations', text: 'Cancel any order before it ships.' },
]

const DEFAULT_SECTIONS = [
  { id: 'categories', enabled: true },
  { id: 'quiz', enabled: true },
  { id: 'recommendations', enabled: true },
  { id: 'bestsellers', enabled: true },
  { id: 'reels', enabled: true },
  { id: 'concerns', enabled: true },
  { id: 'looks', enabled: true },
  { id: 'budget', enabled: true },
  { id: 'new_arrivals', enabled: true },
  { id: 'benefits', enabled: true },
]

function CategoryStrip() {
  const { data: categories, isLoading, error, reload } = useApi(() => catalogService.getCategories())
  const featured = topCategories(categories)
  const hasMore = (categories?.length || 0) > FEATURED_CATEGORY_LIMIT

  if (error) return <ErrorMessage error={error} onRetry={reload} />
  if (!isLoading && (!categories || categories.length === 0)) {
    return <EmptyState title="Coming soon" message="Categories will appear here shortly." />
  }
  return (
    <div className="space-y-4">
      <ul className="scrollbar-hide -mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 pb-2 sm:-mx-6 sm:gap-4 sm:px-6 sm:pb-3 lg:mx-0 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] lg:overflow-visible lg:px-0">
        {isLoading
          ? Array.from({ length: FEATURED_CATEGORY_LIMIT }, (_, index) => (
              <li key={index} className="w-28 shrink-0 sm:w-36 lg:w-auto">
                <Skeleton className="aspect-square rounded-card" />
              </li>
            ))
          : featured.map((category, index) => (
              <Reveal
                as="li"
                key={category.id}
                delay={50 * index}
                className="w-28 shrink-0 snap-start sm:w-36 lg:w-auto"
              >
                <CategoryCard category={category} index={index} />
              </Reveal>
            ))}
      </ul>
      {!isLoading && (hasMore || featured.length > 0) ? (
        <p className="text-center">
          <Link
            to="/shop"
            className="inline-flex min-h-11 items-center text-xs font-semibold tracking-widest text-accent uppercase hover:underline"
          >
            {hasMore ? 'Shop all / all categories' : 'Shop all'}
          </Link>
        </p>
      ) : null}
    </div>
  )
}

function ProductSection({ title, params, viewAllLink }) {
  const { data, isLoading, error, reload } = useApi(
    () => catalogService.getProducts({ page_size: 8, ...params }),
    [params],
  )

  return (
    <section className="page-container section-y space-y-4 sm:space-y-6">
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

function BenefitsStrip({ benefits }) {
  const items = benefits?.length ? benefits : DEFAULT_BENEFITS
  return (
    <section className="bg-cream">
      <ul className="page-container grid gap-4 section-y sm:grid-cols-3 sm:gap-6">
        {items.map((benefit, index) => (
          <Reveal as="li" key={`${benefit.title}-${index}`} delay={100 * index} className="text-center">
            <p className="text-xs font-semibold tracking-widest uppercase sm:text-sm">{benefit.title}</p>
            <p className="mt-1 text-sm text-muted">{benefit.text}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

function sectionEnabled(sections, id) {
  const match = sections.find((section) => section.id === id)
  return match ? match.enabled !== false : true
}

export default function HomePage() {
  const { config, reels } = useStorefront()
  const sections = config?.sections_order?.length ? config.sections_order : DEFAULT_SECTIONS

  return (
    <>
      <HeroSection config={config} />
      <Marquee items={config?.marquee_items} />
      {sections
        .filter((section) => section.enabled !== false)
        .map((section) => {
          switch (section.id) {
            case 'categories':
              return (
                <section
                  key={section.id}
                  className="page-container section-y"
                  data-manage-edit="/manage/categories?focus=categories"
                  data-manage-label="Shop by category"
                >
                  <h2 className="section-title mb-4 text-center sm:mb-6">Shop by category</h2>
                  <CategoryStrip />
                </section>
              )
            case 'quiz':
              return <QuizPromo key={section.id} config={config} />
            case 'recommendations':
              return (
                <div
                  key={section.id}
                  data-manage-edit="/manage/storefront?focus=sections"
                  data-manage-label="Personalized recommendations"
                >
                  <PersonalizedShelf />
                </div>
              )
            case 'bestsellers':
              return (
                <div
                  key={section.id}
                  data-manage-edit="/manage/products?focus=products"
                  data-manage-label="Bestsellers / featured products"
                >
                  <CuratedHomeShelf />
                </div>
              )
            case 'reels':
              return (
                <div
                  key={section.id}
                  data-manage-edit="/manage/storefront?focus=reels"
                  data-manage-label="Video reels"
                >
                  <VideoReels reels={reels} />
                </div>
              )
            case 'concerns':
              return (
                <div
                  key={section.id}
                  data-manage-edit="/manage/storefront?focus=sections"
                  data-manage-label="Shop by concern"
                >
                  <ShopByConcern />
                </div>
              )
            case 'looks':
              return (
                <div
                  key={section.id}
                  data-manage-edit="/manage/looks?focus=looks"
                  data-manage-label="Get the look"
                >
                  <LooksShowcase />
                </div>
              )
            case 'budget':
              return (
                <div
                  key={section.id}
                  data-manage-edit="/manage/storefront?focus=budget"
                  data-manage-label="Shop by budget"
                >
                  <ShopByBudget tiles={config?.budget_tiles} />
                </div>
              )
            case 'new_arrivals':
              return (
                <div
                  key={section.id}
                  data-manage-edit="/manage/products?focus=products"
                  data-manage-label="New arrivals"
                >
                  <ProductSection
                    title="New arrivals"
                    params={{ ordering: 'newest' }}
                    viewAllLink="/shop"
                  />
                </div>
              )
            case 'benefits':
              return (
                <div
                  key={section.id}
                  data-manage-edit="/manage/storefront?focus=benefits"
                  data-manage-label="Benefits / trust strip"
                >
                  <BenefitsStrip benefits={config?.benefits} />
                </div>
              )
            default:
              return null
          }
        })}
      {/* Keep trust badges if older configs omit benefits from sections_order. */}
      {!sections.some((section) => section.id === 'benefits') && sectionEnabled(sections, 'benefits') && (
        <div
          data-manage-edit="/manage/storefront?focus=benefits"
          data-manage-label="Benefits / trust strip"
        >
          <BenefitsStrip benefits={config?.benefits} />
        </div>
      )}
    </>
  )
}
