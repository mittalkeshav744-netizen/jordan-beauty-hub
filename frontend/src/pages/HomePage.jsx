import { Link } from 'react-router'

import EmptyState from '../components/common/EmptyState'
import ErrorMessage from '../components/common/ErrorMessage'
import Reveal from '../components/common/Reveal'
import Skeleton from '../components/common/Skeleton'
import HeroSection from '../components/home/HeroSection'
import LooksShowcase from '../components/home/LooksShowcase'
import Marquee from '../components/home/Marquee'
import PersonalizedShelf from '../components/home/PersonalizedShelf'
import QuizPromo from '../components/home/QuizPromo'
import ShopByBudget from '../components/home/ShopByBudget'
import ShopByConcern from '../components/home/ShopByConcern'
import VideoReels from '../components/home/VideoReels'
import CategoryCard from '../components/products/CategoryCard'
import ProductScrollRow from '../components/products/ProductScrollRow'
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
  { id: 'bestsellers', enabled: false },
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
      <ul className="scrollbar-hide -mx-3 flex min-w-0 snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain px-3 pb-2 sm:-mx-6 sm:gap-4 sm:px-6 sm:pb-3 lg:mx-0 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] lg:overflow-x-clip lg:px-0">
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
          <ProductScrollRow
            products={data?.results ?? []}
            isLoading={isLoading}
            skeletonCount={4}
            ariaLabel={title}
          />
        </Reveal>
      )}
    </section>
  )
}

function BenefitIcon({ kind }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'h-6 w-6',
    'aria-hidden': true,
  }
  if (kind === 'genuine') {
    return (
      <svg {...common}>
        <path d="M12 3l7 3v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    )
  }
  if (kind === 'cancel') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M9 9l6 6M15 9l-6 6" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="3" y="7" width="13" height="10" rx="1.5" />
      <path d="M16 10h3l2 3v4h-5v-7z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </svg>
  )
}

function benefitIconKind(title, index) {
  const label = String(title || '').toLowerCase()
  if (/(cash|cod|delivery|pay)/.test(label)) return 'cod'
  if (/(genuine|authentic|quality|original)/.test(label)) return 'genuine'
  if (/(cancel|return|refund|easy)/.test(label)) return 'cancel'
  return ['cod', 'genuine', 'cancel'][index % 3]
}

function BenefitsStrip({ benefits }) {
  const items = benefits?.length ? benefits : DEFAULT_BENEFITS
  return (
    <section className="bg-cream">
      <ul className="page-container grid gap-5 section-y sm:grid-cols-3 sm:gap-6">
        {items.map((benefit, index) => (
          <Reveal as="li" key={`${benefit.title}-${index}`} delay={100 * index} className="text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <BenefitIcon kind={benefitIconKind(benefit.title, index)} />
            </span>
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
              // Removed: duplicate of PersonalizedShelf; keep id so older storefront configs stay valid.
              return null
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
