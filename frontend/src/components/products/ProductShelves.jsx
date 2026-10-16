import { useEffect, useState } from 'react'

import { useApi } from '../../hooks/useApi'
import { catalogService } from '../../services/catalogService'
import { getRecentlyViewedIds, rememberViewedProduct } from '../../utils/recentlyViewed'
import ProductGrid from './ProductGrid'

const SHELF_SIZE = 4

/** Optional extras under the product page: hidden while empty or if they fail to load. */
function Shelf({ id, title, products, isLoading }) {
  if (!isLoading && !products?.length) return null
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="section-title">
        {title}
      </h2>
      <ProductGrid products={products ?? []} isLoading={isLoading} skeletonCount={SHELF_SIZE} />
    </section>
  )
}

export function RelatedProducts({ slug }) {
  const { data, isLoading } = useApi(() => catalogService.getRelatedProducts(slug), [slug])
  return <Shelf id="related-heading" title="You may also like" products={data} isLoading={isLoading} />
}

/** Render with key={productId} so the list is read again for every product. */
export function RecentlyViewedProducts({ productId }) {
  const [ids] = useState(() => getRecentlyViewedIds().filter((id) => id !== productId).slice(0, SHELF_SIZE))

  useEffect(() => {
    rememberViewedProduct(productId)
  }, [productId])

  const { data, isLoading } = useApi(
    () =>
      ids.length
        ? catalogService.getProducts({ ids: ids.join(','), page_size: ids.length }).then((page) => page.results)
        : Promise.resolve([]),
    [ids],
  )
  const ordered = data ? ids.map((id) => data.find((product) => product.id === id)).filter(Boolean) : null

  return (
    <Shelf
      id="recently-viewed-heading"
      title="Recently viewed"
      products={ordered}
      isLoading={isLoading && ids.length > 0}
    />
  )
}
