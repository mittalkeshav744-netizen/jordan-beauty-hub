import Breadcrumbs from '../components/common/Breadcrumbs'
import EmptyState from '../components/common/EmptyState'
import ErrorMessage from '../components/common/ErrorMessage'
import Reveal from '../components/common/Reveal'
import Skeleton from '../components/common/Skeleton'
import LookCard from '../components/looks/LookCard'
import { useApi } from '../hooks/useApi'
import { looksService } from '../services/looksService'

export default function LooksPage() {
  const { data: looks, isLoading, error, reload } = useApi(() => looksService.list())

  return (
    <div className="page-container pb-12">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Get the look' }]} />
      <div className="py-6 text-center sm:py-8">
        <h1 className="section-title">Get the look</h1>
        <p className="mt-1 text-sm text-muted">Pick a look, follow the steps, add everything to your bag in one tap.</p>
      </div>

      {error && <ErrorMessage error={error} onRetry={reload} />}
      {!error && !isLoading && looks.length === 0 && (
        <EmptyState title="Looks coming soon" message="Our artists are putting together new looks." />
      )}
      <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }, (_, index) => (
              <li key={index}>
                <Skeleton className="aspect-[4/3] rounded-card" />
              </li>
            ))
          : (looks ?? []).map((look, index) => (
              <Reveal as="li" key={look.slug} delay={80 * (index % 3)}>
                <LookCard look={look} />
              </Reveal>
            ))}
      </ul>
    </div>
  )
}
