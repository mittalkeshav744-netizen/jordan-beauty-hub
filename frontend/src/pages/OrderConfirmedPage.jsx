import { useParams } from 'react-router'

import CheckoutSteps from '../components/cart/CheckoutSteps'
import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import { PageLoader } from '../components/common/Spinner'
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

  return (
    <div className="page-container py-6 sm:py-8">
      <CheckoutSteps current={2} />
      <section
        aria-labelledby="order-confirmed-heading"
        className="mx-auto max-w-xl space-y-6 rounded-card border border-line p-5 text-center shadow-card sm:p-8"
      >
        <span
          aria-hidden="true"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-2xl text-success"
        >
          ✓
        </span>
        <div className="space-y-2">
          <h1 id="order-confirmed-heading" className="section-title">
            Thank you for your order!
          </h1>
          <p className="text-sm text-muted">
            Order <strong className="break-all text-ink">{order.number}</strong> has been placed.
          </p>
        </div>
        <dl className="space-y-2 rounded-card bg-cream p-4 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Items</dt>
            <dd>{order.item_count}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Pay on delivery</dt>
            <dd className="font-semibold">{formatPrice(order.grand_total)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-ink-soft">Deliver to</dt>
            <dd className="min-w-0 text-right">
              {address.full_name}, {address.city}, {address.state} {address.postal_code}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-muted">
          Keep the amount ready in cash when your order arrives. You can follow its progress under My orders.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button to={`/account/orders/${order.number}`} variant="outline">
            View order details
          </Button>
          <Button to="/shop" variant="accent">
            Continue shopping
          </Button>
        </div>
      </section>
    </div>
  )
}
