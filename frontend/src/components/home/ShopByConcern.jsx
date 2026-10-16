import { Link } from 'react-router'

import { categoryGradient } from '../../constants/theme'
import { useApi } from '../../hooks/useApi'
import { catalogService } from '../../services/catalogService'
import ErrorMessage from '../common/ErrorMessage'
import Reveal from '../common/Reveal'
import Skeleton from '../common/Skeleton'

export default function ShopByConcern() {
  const { data: concerns, isLoading, error, reload } = useApi(() => catalogService.getConcerns())

  if (!isLoading && !error && concerns.length === 0) return null

  return (
    <section aria-labelledby="concern-heading" className="page-container space-y-6 py-8 sm:py-10">
      <div className="text-center">
        <h2 id="concern-heading" className="section-title">
          Shop by concern
        </h2>
        <p className="mt-1 text-sm text-muted">Tell us what bothers you. We will show what helps.</p>
      </div>
      {error && <ErrorMessage error={error} onRetry={reload} />}
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:thin] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="w-56 shrink-0 sm:w-auto">
                <Skeleton className="h-28 rounded-card" />
              </li>
            ))
          : (concerns ?? []).map((concern, index) => (
              <Reveal as="li" key={concern.id} delay={60 * (index % 4)} className="w-56 shrink-0 snap-start sm:w-auto">
                <Link
                  to={`/shop?concern=${concern.slug}`}
                  className={`group relative flex h-full min-h-28 flex-col justify-end overflow-hidden rounded-card bg-linear-to-br p-4 shadow-card transition-transform duration-300 ease-standard hover:-translate-y-1 hover:shadow-raised ${categoryGradient(index)}`}
                >
                  {concern.image && (
                    <img
                      src={concern.image}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-40 transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                  <span className="relative font-display text-lg leading-tight font-bold text-ink">{concern.name}</span>
                  {concern.description && (
                    <span className="relative mt-1 text-xs text-ink/75">{concern.description}</span>
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink transition-transform duration-300 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </Reveal>
            ))}
      </ul>
    </section>
  )
}
