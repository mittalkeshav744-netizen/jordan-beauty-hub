import { useCallback, useState } from 'react'

import Breadcrumbs from '../components/common/Breadcrumbs'
import Button from '../components/common/Button'
import Drawer from '../components/common/Drawer'
import EmptyState from '../components/common/EmptyState'
import ErrorMessage from '../components/common/ErrorMessage'
import Pagination from '../components/common/Pagination'
import Skeleton from '../components/common/Skeleton'
import ActiveFilters from '../components/products/ActiveFilters'
import CategoryBanner from '../components/products/CategoryBanner'
import FilterPanel from '../components/products/FilterPanel'
import ProductGrid from '../components/products/ProductGrid'
import SortSelect from '../components/products/SortSelect'
import { categoryGradient } from '../constants/theme'
import { useApi } from '../hooks/useApi'
import { useProductFilters } from '../hooks/useProductFilters'
import { catalogService } from '../services/catalogService'

const PAGE_SIZE = 12

const findOnly = (slugs, list) => (slugs.length === 1 ? list.find((item) => item.slug === slugs[0]) : undefined)

function getPageTitle(filters, categories, concerns) {
  if (filters.search) return `Results for “${filters.search}”`
  if (filters.featured) return 'Bestsellers'
  if (filters.category.length === 1) {
    return findOnly(filters.category, categories)?.name ?? 'Shop'
  }
  const concern = findOnly(filters.concern, concerns)
  if (concern) return `For ${concern.name.toLowerCase()}`
  return 'Shop all'
}

/** Banner content: the category's or concern's own photo and colour, or a mix of categories for wider listings. */
function getBanner(filters, categories, concerns) {
  const index = filters.category.length === 1 ? categories.findIndex((item) => item.slug === filters.category[0]) : -1
  const concern = filters.category.length === 0 ? findOnly(filters.concern, concerns) : undefined
  if (concern) {
    return {
      headline: concern.description || `Picked for ${concern.name.toLowerCase()}`,
      images: concern.image ? [concern.image] : [],
      gradient: categoryGradient(concerns.indexOf(concern)),
    }
  }
  if (index >= 0) {
    const category = categories[index]
    return {
      headline: category.description || `Discover ${category.name}`,
      images: category.image ? [category.image] : [],
      gradient: categoryGradient(index),
    }
  }
  return {
    headline: filters.featured ? 'Loved by our customers' : 'Makeup, skincare and more',
    images: categories.filter((item) => item.image).slice(0, 3).map((item) => item.image),
    gradient: categoryGradient(0),
  }
}

export default function ShopPage() {
  const { filters, filterParams, apiParams, updateFilters, clearFilters } = useProductFilters()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const categories = useApi(() => catalogService.getCategories())
  const brands = useApi(() => catalogService.getBrands())
  const concerns = useApi(() => catalogService.getConcerns())
  const priceBounds = useApi(() => catalogService.getPriceRange(filterParams), [filterParams])
  const products = useApi(
    () => catalogService.getProducts({ ...apiParams, page_size: PAGE_SIZE }),
    [apiParams],
  )
  const closeFilters = useCallback(() => setIsFilterOpen(false), [])
  const categoryList = categories.data ?? []
  const concernList = concerns.data ?? []
  const title = getPageTitle(filters, categoryList, concernList)
  const results = products.data?.results ?? []
  const productCount = products.data?.count ?? 0
  const activeFilterCount =
    filters.category.length +
    filters.brand.length +
    (filters.minPrice || filters.maxPrice ? 1 : 0) +
    (filters.inStock ? 1 : 0)

  const filterPanelProps = {
    brands: brands.data ?? [],
    priceBounds: priceBounds.data,
    filters,
    onChange: updateFilters,
    onClear: clearFilters,
  }

  return (
    <div className="page-container pb-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: title }]} />

      {!filters.search &&
        (categories.isLoading ? (
          <Skeleton className="h-48 rounded-card sm:h-64 lg:h-72" />
        ) : (
          <CategoryBanner {...getBanner(filters, categoryList, concernList)} />
        ))}

      <div className="py-6 text-center sm:py-8">
        <h1 className="section-title">{title}</h1>
        {products.data && (
          <p className="mt-1 text-sm text-muted">
            {productCount} product{productCount === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside
          aria-label="Product filters"
          className="hidden lg:sticky lg:top-40 lg:block lg:max-h-[calc(100dvh-11rem)] lg:self-start lg:overflow-y-auto lg:pr-2 lg:[scrollbar-width:thin]"
        >
          <FilterPanel {...filterPanelProps} />
        </aside>
        <Drawer
          isOpen={isFilterOpen}
          onClose={closeFilters}
          title="Filters"
          side="right"
          id="mobile-filters"
          className="lg:hidden"
          footer={
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={clearFilters} disabled={activeFilterCount === 0}>
                Clear all
              </Button>
              <Button className="flex-1" onClick={closeFilters} isLoading={products.isLoading}>
                Show {productCount} {productCount === 1 ? 'item' : 'items'}
              </Button>
            </div>
          }
        >
          <FilterPanel {...filterPanelProps} showHeader={false} />
        </Drawer>

        <section aria-label="Products" className="min-w-0 space-y-5">
          {/* Phones/tablets: [Filters] [Sort] with chips below. Desktop: chips … [Sort]. */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-11 flex-1 sm:flex-none lg:hidden"
              aria-expanded={isFilterOpen}
              aria-controls="mobile-filters"
              onClick={() => setIsFilterOpen(true)}
            >
              Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
            <SortSelect
              className="flex-1 sm:ml-auto sm:flex-none lg:order-2"
              value={filters.ordering}
              onChange={(ordering) => updateFilters({ ordering })}
            />
            <div className="min-w-0 basis-full empty:hidden lg:order-1 lg:flex-1 lg:basis-0">
              <ActiveFilters
                filters={filters}
                categories={categoryList}
                brands={brands.data ?? []}
                onChange={updateFilters}
                onClear={clearFilters}
              />
            </div>
          </div>

          <div aria-live="polite">
            {products.error && <ErrorMessage error={products.error} onRetry={products.reload} />}
            {!products.error && !products.isLoading && results.length === 0 && (
              <EmptyState
                title="No products found"
                message="Try removing a filter or searching for something else."
                action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
              />
            )}
            {!products.error && (products.isLoading || results.length > 0) && (
              <>
                <ProductGrid products={results} isLoading={products.isLoading} />
                <Pagination
                  page={filters.page}
                  pageSize={PAGE_SIZE}
                  totalCount={productCount}
                  onPageChange={(page) => updateFilters({ page })}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
