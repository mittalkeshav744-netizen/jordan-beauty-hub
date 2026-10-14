import { useState } from 'react'
import { Link } from 'react-router'

import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import Pagination from '../../components/common/Pagination'
import Skeleton from '../../components/common/Skeleton'
import StatusBadge from '../../components/common/StatusBadge'
import { useApi } from '../../hooks/useApi'
import { orderService } from '../../services/orderService'
import { formatDate, formatPrice } from '../../utils/format'

const PAGE_SIZE = 12

export default function OrdersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, error, reload } = useApi(() => orderService.list(page), [page])

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (error) return <ErrorMessage error={error} onRetry={reload} />
  if (data.results.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        message="When you place an order it will appear here."
        action={<Button to="/shop">Start shopping</Button>}
      />
    )
  }

  return (
    <section aria-label="My orders">
      <ul className="divide-y divide-line rounded-card border border-line">
        {data.results.map((order) => (
          <li key={order.number}>
            <Link
              to={`/account/orders/${order.number}`}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4 hover:bg-subtle"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold break-all">Order {order.number}</p>
                <p className="text-xs text-muted">
                  {formatDate(order.created_at)} · {order.item_count} item{order.item_count === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={order.status} label={order.status_display} />
                <span className="text-sm font-semibold whitespace-nowrap">{formatPrice(order.grand_total)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={PAGE_SIZE} totalCount={data.count} onPageChange={setPage} />
    </section>
  )
}
