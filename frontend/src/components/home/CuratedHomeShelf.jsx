import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import EmptyState from '../common/EmptyState'
import ErrorMessage from '../common/ErrorMessage'
import Reveal from '../common/Reveal'
import ProductScrollRow from '../products/ProductScrollRow'
import { catalogService } from '../../services/catalogService'

/**
 * Home bestsellers shelf — owner homepage picks when set, otherwise featured products.
 */
export default function CuratedHomeShelf() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [usingPicks, setUsingPicks] = useState(false)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const picks = await catalogService.getHomepagePicks()
      const pickList = picks?.results || picks?.products || (Array.isArray(picks) ? picks : [])
      if (pickList.length > 0) {
        setProducts(pickList)
        setUsingPicks(true)
        return
      }
      const featured = await catalogService.getProducts({ page_size: 8, featured: 'true' })
      setProducts(featured?.results || [])
      setUsingPicks(false)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <section className="page-container section-y space-y-4 sm:space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-widest text-accent uppercase">
            {usingPicks ? 'Picked for you' : 'Featured'}
          </p>
          <h2 className="section-title">Bestsellers</h2>
        </div>
        <Link
          to="/shop?featured=true"
          className="-my-2 shrink-0 py-2 text-xs font-semibold tracking-widest whitespace-nowrap text-accent uppercase hover:underline"
        >
          View all
        </Link>
      </div>
      {error && <ErrorMessage error={error} onRetry={load} />}
      {!error && !isLoading && products.length === 0 && (
        <EmptyState title="Coming soon" message="New products are on their way." />
      )}
      {!error && (isLoading || products.length > 0) && (
        <Reveal>
          <ProductScrollRow
            products={products}
            isLoading={isLoading}
            skeletonCount={4}
            ariaLabel="Bestsellers"
          />
        </Reveal>
      )}
    </section>
  )
}
