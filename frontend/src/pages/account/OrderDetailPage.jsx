import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'

import OrderSummary from '../../components/cart/OrderSummary'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Button from '../../components/common/Button'
import ErrorMessage from '../../components/common/ErrorMessage'
import Skeleton from '../../components/common/Skeleton'
import StatusBadge from '../../components/common/StatusBadge'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { orderService } from '../../services/orderService'
import { getErrorMessage } from '../../utils/errors'
import { formatDate, formatPrice } from '../../utils/format'

export default function OrderDetailPage() {
  const { number } = useParams()
  const location = useLocation()
  const { showToast } = useToast()
  const { data: order, isLoading, error, reload, setData } = useApi(() => orderService.get(number), [number])
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (error) return <ErrorMessage error={error} onRetry={reload} />

  const cancelOrder = async () => {
    setIsCancelling(true)
    try {
      setData(await orderService.cancel(order.number))
      showToast('Your order has been cancelled.')
    } catch (requestError) {
      showToast(getErrorMessage(requestError), 'error')
    } finally {
      setIsCancelling(false)
      setIsConfirmOpen(false)
    }
  }

  const address = order.shipping_address

  return (
    <div className="space-y-6">
      {location.state?.justPlaced && (
        <div role="status" className="rounded-card border border-success/30 bg-success-soft p-4 text-sm text-success">
          Thank you! Your order has been placed. You will pay {formatPrice(order.grand_total)} on delivery.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold break-all">Order {order.number}</h2>
          <p className="text-xs text-muted">Placed on {formatDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} label={order.status_display} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <ul className="divide-y divide-line rounded-card border border-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 p-4 text-sm">
                <div className="min-w-0">
                  {item.product_slug ? (
                    <Link to={`/products/${item.product_slug}`} className="font-medium hover:text-accent">
                      {item.product_name}
                    </Link>
                  ) : (
                    <span className="font-medium">{item.product_name}</span>
                  )}
                  <p className="text-xs text-muted">
                    {item.variant_name} · {formatPrice(item.unit_price)} × {item.quantity}
                  </p>
                </div>
                <span className="shrink-0 font-medium whitespace-nowrap">{formatPrice(item.line_total)}</span>
              </li>
            ))}
          </ul>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-line p-4 text-sm">
              <h3 className="mb-2 text-xs font-semibold tracking-widest uppercase">Delivery address</h3>
              <p className="font-medium">{address.full_name}</p>
              <p className="text-ink-soft">
                {address.line1}
                {address.line2 && `, ${address.line2}`}
              </p>
              <p className="text-ink-soft">
                {address.city}, {address.state} {address.postal_code}
              </p>
              <p className="text-muted">Phone: {address.phone}</p>
            </div>
            <div className="rounded-card border border-line p-4 text-sm">
              <h3 className="mb-2 text-xs font-semibold tracking-widest uppercase">Payment</h3>
              <p>{order.payment_method}</p>
              <p className="text-muted">Status: {order.payment_status}</p>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold tracking-widest uppercase">Order history</h3>
            <ol className="space-y-2 border-l-2 border-line pl-4 text-sm">
              {order.status_history.map((entry) => (
                <li key={`${entry.to_status}-${entry.created_at}`}>
                  <span className="font-medium capitalize">{entry.to_status}</span>
                  <span className="text-muted"> · {formatDate(entry.created_at)}</span>
                  {entry.note && <span className="block text-xs text-muted">{entry.note}</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          <OrderSummary totals={order} title="Payment summary" />
          {order.can_cancel && (
            <Button variant="danger" fullWidth onClick={() => setIsConfirmOpen(true)}>
              Cancel order
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Cancel this order?"
        message="Your items will be released and you will not be charged. This cannot be undone."
        confirmLabel="Yes, cancel order"
        cancelLabel="Keep order"
        isConfirming={isCancelling}
        onConfirm={cancelOrder}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  )
}
