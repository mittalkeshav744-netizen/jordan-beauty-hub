import { useMemo } from 'react'
import { useSearchParams } from 'react-router'

const splitList = (value) => (value ? value.split(',').filter(Boolean) : [])

/**
 * Product filters live in the URL (?category=lips&ordering=price_asc&page=2)
 * so results can be bookmarked, shared, and restored with the back button.
 */
export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') ?? '',
      category: splitList(searchParams.get('category')),
      brand: splitList(searchParams.get('brand')),
      concern: splitList(searchParams.get('concern')),
      minPrice: searchParams.get('min_price') ?? '',
      maxPrice: searchParams.get('max_price') ?? '',
      inStock: searchParams.get('in_stock') === 'true',
      featured: searchParams.get('featured') === 'true',
      ordering: searchParams.get('ordering') ?? 'newest',
      page: Number(searchParams.get('page')) || 1,
    }),
    [searchParams],
  )

  /** Every filter except price, ordering and page — also used to ask for the price range. */
  const filterParams = useMemo(() => {
    const params = {}
    if (filters.search) params.search = filters.search
    if (filters.category.length) params.category = filters.category.join(',')
    if (filters.brand.length) params.brand = filters.brand.join(',')
    if (filters.concern.length) params.concern = filters.concern.join(',')
    if (filters.inStock) params.in_stock = 'true'
    if (filters.featured) params.featured = 'true'
    return params
  }, [filters])

  /** Query parameters in the format the products API expects. */
  const apiParams = useMemo(() => {
    const params = { ...filterParams, ordering: filters.ordering, page: filters.page }
    if (filters.minPrice) params.min_price = filters.minPrice
    if (filters.maxPrice) params.max_price = filters.maxPrice
    return params
  }, [filterParams, filters])

  const updateFilters = (changes) => {
    const next = { ...filters, page: 1, ...changes }
    const params = new URLSearchParams()
    if (next.search) params.set('search', next.search)
    if (next.category.length) params.set('category', next.category.join(','))
    if (next.brand.length) params.set('brand', next.brand.join(','))
    if (next.concern.length) params.set('concern', next.concern.join(','))
    if (next.minPrice) params.set('min_price', next.minPrice)
    if (next.maxPrice) params.set('max_price', next.maxPrice)
    if (next.inStock) params.set('in_stock', 'true')
    if (next.featured) params.set('featured', 'true')
    if (next.ordering !== 'newest') params.set('ordering', next.ordering)
    if (next.page > 1) params.set('page', String(next.page))
    setSearchParams(params)
  }

  const clearFilters = () => setSearchParams(filters.search ? { search: filters.search } : {})

  return { filters, filterParams, apiParams, updateFilters, clearFilters }
}
