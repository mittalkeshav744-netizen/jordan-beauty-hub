import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import FaIcon from '../../components/manage/FaIcon'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import ManageToolbar from '../../components/manage/ManageToolbar'
import ProductEditorModal from '../../components/manage/ProductEditorModal'
import Pagination from '../../components/common/Pagination'
import Skeleton from '../../components/common/Skeleton'
import { useApi } from '../../hooks/useApi'
import { useManageFocus } from '../../hooks/useManageFocus'
import { portalService } from '../../services/portalService'
import { formatPrice } from '../../utils/format'

const PAGE_SIZE = 24
const SIZE_STORAGE_KEY = 'jbh-manage-products-size'

const STOCK_FILTERS = [
  { value: '', label: 'All products' },
  { value: 'in', label: 'In stock' },
  { value: 'out', label: 'Out of stock' },
  { value: 'low', label: 'Low stock' },
]

/** Card density — S compact rows, M balanced (default), L taller photo cards. */
const CARD_SIZES = {
  S: {
    label: 'S',
    title: 'Compact',
    grid: 'grid list-none gap-2 sm:grid-cols-2 xl:grid-cols-3',
    thumb: 'h-12 w-12',
    layout: 'row',
  },
  M: {
    label: 'M',
    title: 'Medium',
    grid: 'grid list-none gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
    thumb: 'h-16 w-16',
    layout: 'row',
  },
  L: {
    label: 'L',
    title: 'Large',
    grid: 'grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    thumb: 'h-28 w-full',
    layout: 'stack',
  },
}

function readStoredSize() {
  try {
    const value = localStorage.getItem(SIZE_STORAGE_KEY)
    if (value && CARD_SIZES[value]) return value
  } catch {
    /* ignore */
  }
  return 'M'
}

function stockTone(product) {
  if (!product.in_stock) return 'danger'
  if ((product.total_stock ?? 0) <= 5) return 'warning'
  return 'ok'
}

function StatusChips({ product, compact = false }) {
  const tone = stockTone(product)
  const stockLabel = !product.in_stock ? 'Out of stock' : `Stock ${product.total_stock ?? 0}`
  const chip = compact
    ? 'rounded-btn px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide uppercase'
    : 'rounded-btn px-2 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase'

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {!product.is_active ? (
        <span className={`${chip} bg-subtle text-muted`}>Inactive</span>
      ) : null}
      {product.is_featured ? (
        <span className={`${chip} bg-accent-soft text-accent`}>Featured</span>
      ) : null}
      <span
        className={`${chip} ${
          tone === 'danger'
            ? 'bg-danger-soft text-danger'
            : tone === 'warning'
              ? 'bg-warning-soft text-warning'
              : 'bg-subtle text-ink'
        }`}
      >
        {stockLabel}
      </span>
    </div>
  )
}

function ProductThumb({ product, className }) {
  if (product.primary_image) {
    return (
      <img
        src={product.primary_image}
        alt=""
        className={`${className} shrink-0 rounded-control object-cover bg-subtle`}
      />
    )
  }
  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-control bg-subtle text-center text-[0.55rem] font-semibold tracking-wide text-muted uppercase`}
    >
      No photo
    </span>
  )
}

function ProductCard({ product, onOpen, sizeKey }) {
  const size = CARD_SIZES[sizeKey] || CARD_SIZES.M

  if (size.layout === 'stack') {
    return (
      <li>
        <button
          type="button"
          onClick={onOpen}
          className="manage-panel group flex h-full w-full flex-col overflow-hidden p-2.5 text-left transition-[box-shadow,transform] duration-200 ease-standard hover:-translate-y-0.5 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-3"
        >
          <ProductThumb product={product} className={`${size.thumb} rounded-card`} />
          <div className="mt-2.5 flex min-w-0 flex-1 flex-col gap-2">
            <div className="min-w-0">
              <p className="truncate text-[0.65rem] font-semibold tracking-[0.1em] text-muted uppercase">
                {product.brand_name || 'Unbranded'}
                {product.category_name ? ` · ${product.category_name}` : ''}
              </p>
              <h3 className="mt-0.5 line-clamp-2 font-display text-sm font-semibold tracking-tight text-ink">
                {product.name}
              </h3>
            </div>
            <StatusChips product={product} compact />
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2">
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-ink">
                  {product.min_price ? formatPrice(product.min_price) : '—'}
                </p>
                <p className="text-[0.7rem] text-muted">
                  {product.variant_count} option{product.variant_count === 1 ? '' : 's'}
                </p>
              </div>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-btn border border-line text-ink-soft transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-white">
                <FaIcon icon="pen" className="h-3 w-3" />
                <span className="sr-only">Edit {product.name}</span>
              </span>
            </div>
          </div>
        </button>
      </li>
    )
  }

  const isCompact = sizeKey === 'S'

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`manage-panel group flex w-full items-start text-left transition-[box-shadow,background-color] duration-200 ease-standard hover:bg-cream/60 hover:shadow-studio focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:items-center ${
          isCompact ? 'gap-2.5 p-2.5' : 'gap-3 p-3'
        }`}
      >
        <ProductThumb product={product} className={size.thumb} />
        <div className="min-w-0 flex-1">
          <h3
            className={`truncate font-display font-semibold tracking-tight text-ink ${
              isCompact ? 'text-sm' : 'text-[0.95rem]'
            }`}
          >
            {product.name}
          </h3>
          <p className={`truncate text-muted ${isCompact ? 'text-[0.7rem]' : 'text-xs'}`}>
            {product.brand_name || 'Unbranded'}
            {product.category_name ? ` · ${product.category_name}` : ''}
            {` · ${product.variant_count} option${product.variant_count === 1 ? '' : 's'}`}
          </p>
          <div className="mt-1.5">
            <StatusChips product={product} compact={isCompact} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className={`font-display font-semibold text-ink ${isCompact ? 'text-sm' : 'text-base'}`}>
            {product.min_price ? formatPrice(product.min_price) : '—'}
          </p>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-btn border border-line text-ink-soft transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-white">
            <FaIcon icon="pen" className="h-3 w-3" />
            <span className="sr-only">Edit {product.name}</span>
          </span>
        </div>
      </button>
    </li>
  )
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const stock = searchParams.get('stock') || (searchParams.get('low_stock') === '1' ? 'low' : '')
  const categoryId = searchParams.get('category') || ''
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState(null)
  const [cardSize, setCardSize] = useState(readStoredSize)
  const query = searchParams.get('search') || ''
  const sizeConfig = CARD_SIZES[cardSize] || CARD_SIZES.M

  const options = useApi(() => portalService.catalogOptions(), [])
  const { data, isLoading, error, reload } = useApi(
    () =>
      portalService.listProducts({
        page,
        page_size: PAGE_SIZE,
        search: query || undefined,
        stock: stock || undefined,
        low_stock: stock === 'low' ? '1' : undefined,
        category: categoryId || undefined,
      }),
    [page, query, stock, categoryId],
  )

  useEffect(() => {
    const editId = location.state?.editProductId
    if (editId == null) return
    setEditor({ mode: 'edit', id: editId })
    navigate(location.pathname + location.search, { replace: true, state: {} })
  }, [location.state, location.pathname, location.search, navigate])

  const applySearch = (event) => {
    event.preventDefault()
    const next = new URLSearchParams(searchParams)
    if (search.trim()) next.set('search', search.trim())
    else next.delete('search')
    setPage(1)
    setSearchParams(next)
  }

  const setStockFilter = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('stock', value)
    else next.delete('stock')
    next.delete('low_stock')
    setPage(1)
    setSearchParams(next)
  }

  const setCategoryFilter = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('category', value)
    else next.delete('category')
    setPage(1)
    setSearchParams(next)
  }

  const activeStockLabel =
    STOCK_FILTERS.find((item) => item.value === stock)?.label || 'All products'
  const categoryOptions = options.data?.categories || []
  const activeCategoryName =
    categoryOptions.find((row) => String(row.id) === String(categoryId))?.name || ''

  const changeCardSize = (next) => {
    setCardSize(next)
    try {
      localStorage.setItem(SIZE_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const handleSaved = () => {
    reload()
  }

  useManageFocus({ ready: !isLoading })

  return (
    <section aria-labelledby="manage-products-title" data-manage-section="products">
      <ManagePageHeader
        title={activeCategoryName ? `Products · ${activeCategoryName}` : 'Products'}
        description={
          activeCategoryName
            ? `Showing products in “${activeCategoryName}” only. Clear the category filter to see the full catalogue.`
            : 'Every catalogue product is listed here — including inactive and out of stock. Open one in the editor popup.'
        }
      />

      <ManageToolbar
        search={
          <form onSubmit={applySearch} className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                aria-label="Search products"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, shade, size or SKU"
                className="min-h-11 w-full rounded-control border border-line bg-canvas py-2 pr-3 pl-3 text-sm"
              />
            </div>
            <button
              type="submit"
              aria-label="Search"
              title="Search"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-ink text-white shadow-[0_1px_2px_rgb(17_17_17/0.12)] transition-[background-color,box-shadow,transform] hover:bg-ink-soft hover:shadow-[0_4px_12px_rgb(17_17_17/0.14)] active:scale-[0.98]"
            >
              <FaIcon icon="search" className="h-4 w-4" />
            </button>
          </form>
        }
        filters={
          <>
            <label className="relative inline-flex w-full min-w-0 items-center sm:w-auto sm:min-w-[10.5rem]">
              <span className="sr-only">Filter by category</span>
              <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-muted">
                <FaIcon icon="categories" className="h-3.5 w-3.5" />
              </span>
              <select
                aria-label="Filter by category"
                value={categoryId}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="min-h-11 w-full appearance-none rounded-btn border border-line bg-canvas py-2 pr-8 pl-9 text-sm font-semibold text-ink transition-colors hover:bg-subtle focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
              >
                <option value="">All categories</option>
                {categoryOptions.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted">
                <FaIcon icon="chevronRight" className="h-3 w-3 rotate-90" />
              </span>
            </label>
            <label className="relative inline-flex w-full min-w-0 items-center sm:w-auto sm:min-w-[10.5rem]">
              <span className="sr-only">Filter by stock</span>
              <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-muted">
                <FaIcon icon="filter" className="h-3.5 w-3.5" />
              </span>
              <select
                aria-label="Filter by stock"
                value={stock}
                title={`Filter: ${activeStockLabel}`}
                onChange={(event) => setStockFilter(event.target.value)}
                className="min-h-11 w-full appearance-none rounded-btn border border-line bg-canvas py-2 pr-8 pl-9 text-sm font-semibold text-ink transition-colors hover:bg-subtle focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
              >
                {STOCK_FILTERS.map((item) => (
                  <option key={item.value || 'all'} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted">
                <FaIcon icon="chevronRight" className="h-3 w-3 rotate-90" />
              </span>
            </label>
          </>
        }
        actions={
          <Button type="button" onClick={() => setEditor({ mode: 'create', id: null })}>
            <FaIcon icon="plus" className="mr-2 h-3.5 w-3.5" />
            Add product
          </Button>
        }
      />

      {isLoading ? (
        <ul className={`mt-5 ${sizeConfig.grid}`}>
          {Array.from({ length: 8 }).map((_, index) => (
            <li key={index} className="manage-panel p-3">
              <div className="flex items-center gap-3">
                <Skeleton className={`${sizeConfig.thumb} shrink-0 rounded-control`} />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <ErrorMessage error={error} onRetry={reload} className="mt-4" /> : null}
      {!isLoading && !error && data?.results?.length === 0 ? (
        <EmptyState
          title="No products found"
          message={
            query
              ? `Nothing matches “${query}”. Search checks the product name, shade, size and SKU, including out of stock.`
              : 'Nothing matches these filters.'
          }
          className="mt-6"
        />
      ) : null}

      {!isLoading && !error && data?.results?.length > 0 ? (
        <>
          <div className="mt-5 mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Showing{' '}
              <span className="font-semibold text-ink">{data.results.length}</span> of{' '}
              <span className="font-semibold text-ink">{data.count}</span> product
              {data.count === 1 ? '' : 's'}
            </p>
            <div
              role="group"
              aria-label="Product card size"
              className="inline-flex items-center gap-1 rounded-btn border border-line bg-canvas p-1"
            >
              <span className="px-2 text-[0.65rem] font-semibold tracking-[0.12em] text-muted uppercase">
                Size
              </span>
              {Object.entries(CARD_SIZES).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  title={config.title}
                  aria-pressed={cardSize === key}
                  onClick={() => changeCardSize(key)}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-btn px-2.5 text-xs font-bold transition-colors ${
                    cardSize === key
                      ? 'bg-ink text-white'
                      : 'text-ink-soft hover:bg-subtle hover:text-ink'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
          <ul className={sizeConfig.grid}>
            {data.results.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                sizeKey={cardSize}
                onOpen={() => setEditor({ mode: 'edit', id: product.id })}
              />
            ))}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} totalCount={data.count} onPageChange={setPage} />
        </>
      ) : null}

      <ProductEditorModal
        isOpen={Boolean(editor)}
        onClose={() => setEditor(null)}
        mode={editor?.mode || 'create'}
        productId={editor?.id}
        catalogOptions={options.data || { brands: [], categories: [] }}
        onSaved={handleSaved}
      />
    </section>
  )
}
