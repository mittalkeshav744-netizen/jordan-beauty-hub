import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'

import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import Skeleton from '../../components/common/Skeleton'
import StatusBadge from '../../components/common/StatusBadge'
import FaIcon from '../../components/manage/FaIcon'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import ManageToolbar from '../../components/manage/ManageToolbar'
import OrderDetailContent from '../../components/manage/OrderDetailContent'
import PackagingDocumentsModal from '../../components/manage/packaging/PackagingDocumentsModal'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'
import { getErrorMessage } from '../../utils/errors'
import { formatDate, formatPrice } from '../../utils/format'

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]
const PAGE_SIZE = 12

export default function OrdersPage() {
  const { number: routeNumber } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || ''
  const query = searchParams.get('search') || ''
  const [search, setSearch] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (query !== syncedQuery) {
    setSyncedQuery(query)
    setSearch(query)
  }
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(() => new Set())
  const selectionKey = `${page}|${status}|${query}`
  const [syncedSelectionKey, setSyncedSelectionKey] = useState(selectionKey)
  if (selectionKey !== syncedSelectionKey) {
    setSyncedSelectionKey(selectionKey)
    setSelected(new Set())
  }
  const [packagingOrders, setPackagingOrders] = useState([])
  const [packagingOpen, setPackagingOpen] = useState(false)
  const [packagingLoading, setPackagingLoading] = useState(false)
  const openNumber = routeNumber || null

  const { data, isLoading, error, reload } = useApi(
    () =>
      portalService.listOrders({
        page,
        page_size: PAGE_SIZE,
        status: status || undefined,
        search: query || undefined,
      }),
    [page, status, query],
  )

  const pageNumbers = (data?.results || []).map((order) => order.number)

  const listQuery = searchParams.toString()
  const listPath = listQuery ? `/manage/orders?${listQuery}` : '/manage/orders'

  const openOrder = (number) => {
    navigate(`/manage/orders/${number}${listQuery ? `?${listQuery}` : ''}`)
  }

  const closeOrder = () => {
    navigate(listPath)
  }

  const applyFilters = (event) => {
    event.preventDefault()
    const next = new URLSearchParams()
    if (status) next.set('status', status)
    if (search.trim()) next.set('search', search.trim())
    setPage(1)
    setSearchParams(next)
  }

  const setStatusFilter = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('status', value)
    else next.delete('status')
    setPage(1)
    setSearchParams(next)
  }

  const allOnPageSelected =
    pageNumbers.length > 0 && pageNumbers.every((number) => selected.has(number))

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) {
        pageNumbers.forEach((number) => next.delete(number))
      } else {
        pageNumbers.forEach((number) => next.add(number))
      }
      return next
    })
  }

  const toggleSelect = (number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(number)) next.delete(number)
      else next.add(number)
      return next
    })
  }

  const openBulkPackaging = async () => {
    const numbers = [...selected]
    if (!numbers.length) return
    setPackagingLoading(true)
    try {
      const orders = await Promise.all(numbers.map((number) => portalService.getOrder(number)))
      setPackagingOrders(orders)
      setPackagingOpen(true)
    } catch (err) {
      showToast(getErrorMessage(err) || 'Could not load orders for packaging.', 'error')
    } finally {
      setPackagingLoading(false)
    }
  }

  return (
    <section aria-labelledby="manage-orders-title">
      <ManagePageHeader
        title="Orders"
        description="Fulfil and track every order. Open a row for detail, or select several for packaging documents."
      />

      <ManageToolbar
        search={
          <form onSubmit={applyFilters} className="flex w-full items-center gap-2">
            <label className="sr-only" htmlFor="order-search">
              Search orders
            </label>
            <div className="relative min-w-0 flex-1">
              <input
                id="order-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Number, email, name, phone"
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
          <label className="relative inline-flex w-full min-w-0 items-center sm:w-auto sm:min-w-[11rem]">
            <span className="sr-only">Filter orders</span>
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-muted">
              <FaIcon icon="filter" className="h-3.5 w-3.5" />
            </span>
            <select
              aria-label="Filter orders"
              value={status}
              title={`Filter: ${STATUS_FILTERS.find((item) => item.value === status)?.label || 'All statuses'}`}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-11 w-full appearance-none rounded-btn border border-line bg-canvas py-2 pr-8 pl-9 text-sm font-semibold text-ink transition-colors hover:bg-subtle focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
            >
              {STATUS_FILTERS.map((item) => (
                <option key={item.value || 'all'} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted">
              <FaIcon icon="chevronRight" className="h-3 w-3 rotate-90" />
            </span>
          </label>
        }
        actions={
          selected.size > 0 ? (
            <Button
              type="button"
              size="sm"
              disabled={packagingLoading}
              isLoading={packagingLoading}
              onClick={openBulkPackaging}
            >
              Packaging documents ({selected.size})
            </Button>
          ) : null
        }
      />

      {isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {error ? <ErrorMessage error={error} onRetry={reload} /> : null}
      {!isLoading && !error && data?.results?.length === 0 ? (
        <EmptyState title="No orders found" message="Try another status or search." />
      ) : null}

      {!isLoading && !error && data?.results?.length > 0 ? (
        <>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              {data.count} order{data.count === 1 ? '' : 's'}
              {status ? ` · ${status}` : ''}
              {query ? ` · “${query}”` : ''}
            </p>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-ink">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded-sm border-line accent-ink"
              />
              Select page
            </label>
          </div>
          <ul className="manage-panel divide-y divide-line">
            {data.results.map((order) => {
              const isChecked = selected.has(order.number)
              return (
                <li key={order.number} className="flex items-stretch">
                  <label className="flex shrink-0 items-center px-3 sm:px-4">
                    <span className="sr-only">Select order {order.number}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(order.number)}
                      className="h-4 w-4 rounded-sm border-line accent-ink"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => openOrder(order.number)}
                    className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 py-4 pr-4 text-left hover:bg-subtle"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold break-all">{order.number}</p>
                      <p className="text-xs text-muted">
                        {order.customer_name || order.customer_email} · {formatDate(order.created_at)} ·{' '}
                        {order.item_count} item{order.item_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={order.status} label={order.status_display} />
                      <span className="text-sm font-semibold">{formatPrice(order.grand_total)}</span>
                      <FaIcon icon="eye" className="h-3.5 w-3.5 text-muted" />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} totalCount={data.count} onPageChange={setPage} />
        </>
      ) : null}

      <Modal
        isOpen={Boolean(openNumber)}
        onClose={closeOrder}
        title="Order detail"
        size="xl"
      >
        {openNumber ? (
          <OrderDetailContent
            number={openNumber}
            onCustomerOpen={(id) => navigate(`/manage/customers/${id}`)}
          />
        ) : null}
      </Modal>

      <PackagingDocumentsModal
        isOpen={packagingOpen}
        onClose={() => {
          setPackagingOpen(false)
          setPackagingOrders([])
        }}
        orders={packagingOrders}
      />
    </section>
  )
}
