import { Link } from 'react-router'

import { useApi } from '../../hooks/useApi'
import { looksService } from '../../services/looksService'
import ErrorMessage from '../common/ErrorMessage'
import Reveal from '../common/Reveal'
import Skeleton from '../common/Skeleton'
import LookCard from '../looks/LookCard'

const SHOWCASE_SIZE = 3

export default function LooksShowcase() {
  const { data: looks, isLoading, error, reload } = useApi(() => looksService.list())

  if (!isLoading && !error && looks.length === 0) return null

  return (
    <section aria-labelledby="looks-heading" className="bg-cream py-10 sm:py-14">
      <div className="page-container space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="looks-heading" className="section-title">
              Get the look
            </h2>
            <p className="mt-1 text-sm text-muted">Complete looks, step by step. Add everything in one tap.</p>
          </div>
          <Link
            to="/looks"
            className="-my-2 shrink-0 py-2 text-xs font-semibold tracking-widest whitespace-nowrap text-accent uppercase hover:underline"
          >
            All looks
          </Link>
        </div>
        {error && <ErrorMessage error={error} onRetry={reload} />}
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: SHOWCASE_SIZE }, (_, index) => (
                <li key={index}>
                  <Skeleton className="aspect-[4/3] rounded-card" />
                </li>
              ))
            : (looks ?? []).slice(0, SHOWCASE_SIZE).map((look, index) => (
                <Reveal as="li" key={look.slug} delay={100 * index}>
                  <LookCard look={look} />
                </Reveal>
              ))}
        </ul>
      </div>
    </section>
  )
}
