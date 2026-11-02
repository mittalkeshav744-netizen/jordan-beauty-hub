import { Link } from 'react-router'

import EmptyState from '../common/EmptyState'
import ErrorMessage from '../common/ErrorMessage'
import Reveal from '../common/Reveal'
import ProductGrid from '../products/ProductGrid'
import { useApi } from '../../hooks/useApi'
import { catalogService } from '../../services/catalogService'

/**
 * Home bestsellers shelf (featured products).
 * Owner “home picks” curation was removed from Manage — shop always uses featured.
 */
export default function CuratedHomeShelf() {
  const {
    data: featured,
    isLoading,
    error,
    reload,
  } = useApi(() => catalogService.getProducts({ page_size: 8, featured: 'true' }), [])

  const products = featured?.results || []

  return (
    <section className="page-container section-y space-y-4 sm:space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-widest text-accent uppercase">Featured</p>
          <h2 className="section-title">Bestsellers</h2>
        </div>
        <Link
          to="/shop?featured=true"
          className="-my-2 shrink-0 py-2 text-xs font-semibold tracking-widest whitespace-nowrap text-accent uppercase hover:underline"
        >
          View all
        </Link>
      </div>
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {!error && !isLoading && products.length === 0 && (
        <EmptyState title="Coming soon" message="New products are on their way." />
      )}
      {!error && (isLoading || products.length > 0) && (
        <Reveal>
          <ProductGrid products={products} isLoading={isLoading} skeletonCount={4} />
        </Reveal>
      )}
    </section>
  )
}
