import { useParams } from 'react-router'

import CheckoutSteps from '../components/cart/CheckoutSteps'
import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import { PageLoader } from '../components/common/Spinner'
import SuccessPanel from '../components/common/SuccessPanel'
import { useApi } from '../hooks/useApi'
import { orderService } from '../services/orderService'
import { formatPrice } from '../utils/format'
import NotFoundPage from './NotFoundPage'

export default function OrderConfirmedPage() {
  const { number } = useParams()
  const { data: order, isLoading, error, reload } = useApi(() => orderService.get(number), [number])

  if (isLoading) return <PageLoader label="Loading your order…" />
  if (error?.response?.status === 404) return <NotFoundPage />
  if (error) {
    return (
      <div className="page-container py-10">
        <ErrorMessage error={error} onRetry={reload} />
      </div>
    )
  }

  const address = order.shipping_address
  const methodCode = (order.payment_method_code || '').toLowerCase()
  const paidOnline = methodCode === 'razorpay' && order.payment_status === 'paid'
  const isCod = methodCode !== 'razorpay'

  return (
    <div className="page-container py-6 sm:py-8">
      <CheckoutSteps current={2} />
      <SuccessPanel
        headingId="order-confirmed-heading"
        title={
          paidOnline ? 'Congratulations — payment received!' : 'Congratulations — order placed!'
        }
        message={
          <>
            Order <strong className="break-all text-ink">{order.number}</strong> is confirmed.
          </>
        }
        actions={
          <>
            <Button to={`/account/orders/${order.number}`} variant="outline">
              View order details
            </Button>
            <Button to="/shop" variant="accent">
              Continue shopping
            </Button>
          </>
        }
      >
        <dl className="space-y-2 rounded-card bg-cream p-4 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Items</dt>
            <dd>{order.item_count}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">{isCod && !paidOnline ? 'Pay on delivery' : 'Amount'}</dt>
            <dd className="font-semibold">{formatPrice(order.grand_total)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Payment</dt>
            <dd className="text-right capitalize">
              {order.payment_method || '—'}
              {order.payment_status ? ` · ${order.payment_status}` : ''}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-ink-soft">Deliver to</dt>
            <dd className="min-w-0 text-right">
              {address.full_name}, {address.city}, {address.state} {address.postal_code}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-muted">
          {paidOnline
            ? 'Your online payment was received. You can follow delivery progress under My orders.'
            : 'Keep the amount ready in cash when your order arrives. You can follow its progress under My orders.'}
        </p>
      </SuccessPanel>
    </div>
  )
}
