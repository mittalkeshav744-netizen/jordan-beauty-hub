import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import Skeleton from '../../components/common/Skeleton'
import CustomerDetailContent from '../../components/manage/CustomerDetailContent'
import FaIcon from '../../components/manage/FaIcon'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import ManageToolbar from '../../components/manage/ManageToolbar'
import { useApi } from '../../hooks/useApi'
import { portalService } from '../../services/portalService'
import { formatDate } from '../../utils/format'

const PAGE_SIZE = 12

export default function CustomersPage() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const openId = routeId || null
  const { data, isLoading, error, reload } = useApi(
    () => portalService.listCustomers({ page, page_size: PAGE_SIZE, search: query || undefined }),
    [page, query],
  )

  const openCustomer = (id) => navigate(`/manage/customers/${id}`)
  const closeCustomer = () => navigate('/manage/customers')

  return (
    <section aria-labelledby="manage-customers-title">
      <ManagePageHeader
        title="Customers"
        description="All registered accounts. Open a row for addresses and recent orders in a popup."
      />

      <ManageToolbar
        search={
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setQuery(search.trim())
            }}
            className="flex flex-wrap gap-2"
          >
            <div className="relative min-w-[12rem] flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-muted">
                <FaIcon icon="search" className="h-3.5 w-3.5" />
              </span>
              <input
                aria-label="Search customers"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Email, name or phone"
                className="min-h-11 w-full rounded-control border border-line bg-canvas py-2 pr-3 pl-9 text-sm"
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
      />

      {isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {error ? <ErrorMessage error={error} onRetry={reload} /> : null}
      {!isLoading && !error && data?.results?.length === 0 ? (
        <EmptyState title="No customers" message="No matches for this search." />
      ) : null}

      {!isLoading && !error && data?.results?.length > 0 ? (
        <>
          <ul className="manage-panel divide-y divide-line">
            {data.results.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => openCustomer(customer.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-subtle"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold break-all">
                      {customer.email}
                      {customer.is_staff ? (
                        <span className="rounded-control bg-accent-soft px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-accent uppercase">
                          Staff
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted">
                      {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'No name'}
                      {customer.phone ? ` · ${customer.phone}` : ''}
                      {' · joined '}
                      {formatDate(customer.date_joined)}
                    </p>
                  </div>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {customer.order_count} orders
                    <FaIcon icon="eye" className="h-3.5 w-3.5 text-muted" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} totalCount={data.count} onPageChange={setPage} />
        </>
      ) : null}

      <Modal isOpen={Boolean(openId)} onClose={closeCustomer} title="Customer" size="xl">
        {openId ? (
          <CustomerDetailContent
            id={openId}
            onOrderOpen={(number) => navigate(`/manage/orders/${number}`)}
          />
        ) : null}
      </Modal>
    </section>
  )
}
