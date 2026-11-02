import { Link } from 'react-router'

import ErrorMessage from '../common/ErrorMessage'
import Skeleton from '../common/Skeleton'
import StatusBadge from '../common/StatusBadge'
import { useApi } from '../../hooks/useApi'
import { portalService } from '../../services/portalService'
import { formatDate, formatPrice } from '../../utils/format'

export default function CustomerDetailContent({ id, onOrderOpen }) {
  const { data: customer, isLoading, error, reload } = useApi(() => portalService.getCustomer(id), [id])

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (error) return <ErrorMessage error={error} onRetry={reload} />

  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-xl font-semibold break-all">{customer.email}</p>
        <p className="mt-1 text-sm text-muted">
          {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'No name'}
          {customer.phone ? ` · ${customer.phone}` : ''}
          {' · '}
          {customer.order_count} orders · joined {formatDate(customer.date_joined)}
          {!customer.is_active ? ' · inactive' : ''}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-subtle/40 p-4">
          <h3 className="text-sm font-semibold">Addresses</h3>
          {customer.addresses?.length ? (
            <ul className="mt-3 space-y-3 text-sm">
              {customer.addresses.map((address) => (
                <li key={address.id} className="rounded-control bg-canvas p-3">
                  <p className="font-medium">
                    {address.full_name}
                    {address.is_default ? (
                      <span className="ml-2 text-xs font-semibold text-accent">Default</span>
                    ) : null}
                  </p>
                  <p className="text-ink-soft">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ''}
                    <br />
                    {address.city}, {address.state} {address.postal_code}
                    <br />
                    {address.phone}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">No saved addresses.</p>
          )}
        </div>

        <div className="rounded-card border border-line bg-subtle/40 p-4">
          <h3 className="text-sm font-semibold">Recent orders</h3>
          {customer.recent_orders?.length ? (
            <ul className="mt-3 divide-y divide-line">
              {customer.recent_orders.map((order) => (
                <li key={order.number}>
                  {onOrderOpen ? (
                    <button
                      type="button"
                      onClick={() => onOrderOpen(order.number)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm hover:text-accent"
                    >
                      <span className="min-w-0">
                        <span className="font-semibold break-all">{order.number}</span>
                        <span className="block text-xs text-muted">{formatDate(order.created_at)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={order.status} label={order.status_display} />
                        <span className="font-semibold">{formatPrice(order.grand_total)}</span>
                      </span>
                    </button>
                  ) : (
                    <Link
                      to={`/manage/orders/${order.number}`}
                      className="flex items-center justify-between gap-3 py-3 text-sm hover:text-accent"
                    >
                      <span className="min-w-0">
                        <span className="font-semibold break-all">{order.number}</span>
                        <span className="block text-xs text-muted">{formatDate(order.created_at)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={order.status} label={order.status_display} />
                        <span className="font-semibold">{formatPrice(order.grand_total)}</span>
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">No orders yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
