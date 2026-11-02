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
    <section aria-labelledby="concern-heading" className="page-container section-y space-y-4 sm:space-y-6">
      <div className="text-center">
        <h2 id="concern-heading" className="section-title">
          Shop by concern
        </h2>
        <p className="mt-1 text-sm text-muted">Tell us what bothers you. We will show what helps.</p>
      </div>
      {error && <ErrorMessage error={error} onRetry={reload} />}
      <ul className="scrollbar-hide -mx-3 flex snap-x gap-2.5 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-3 md:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="w-48 shrink-0 sm:w-auto">
                <Skeleton className="h-24 rounded-card sm:h-28" />
              </li>
            ))
          : (concerns ?? []).map((concern, index) => (
              <Reveal as="li" key={concern.id} delay={60 * (index % 4)} className="w-48 shrink-0 snap-start sm:w-auto">
                <Link
                  to={`/shop?concern=${concern.slug}`}
                  className={`group relative flex h-full min-h-24 flex-col justify-end overflow-hidden rounded-card bg-linear-to-br p-3 shadow-card transition-transform duration-300 ease-standard hover:-translate-y-1 hover:shadow-raised sm:min-h-28 sm:p-4 ${categoryGradient(index)}`}
                >
                  {concern.image && (
                    <img
                      src={concern.image}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-40 transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                  <span className="relative font-display text-base leading-tight font-bold text-ink sm:text-lg">
                    {concern.name}
                  </span>
                  {concern.description && (
                    <span className="relative mt-0.5 line-clamp-2 text-[0.7rem] text-ink/75 sm:mt-1 sm:text-xs">
                      {concern.description}
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm text-ink transition-transform duration-300 group-hover:translate-x-1 sm:top-3 sm:right-3 sm:h-8 sm:w-8 sm:text-base"
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
