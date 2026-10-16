import { useState } from 'react'

import CartItem from '../components/cart/CartItem'
import CheckoutSteps from '../components/cart/CheckoutSteps'
import FreeShippingProgress from '../components/cart/FreeShippingProgress'
import OrderSummary from '../components/cart/OrderSummary'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import ErrorMessage from '../components/common/ErrorMessage'
import { PageLoader } from '../components/common/Spinner'
import { useCart } from '../hooks/useCart'
import { useToast } from '../hooks/useToast'
import { getErrorMessage } from '../utils/errors'

export default function CartPage() {
  const { cart, isLoading, error, refreshCart, updateItem, removeItem } = useCart()
  const { showToast } = useToast()
  const [updatingItemId, setUpdatingItemId] = useState(null)

  const runUpdate = async (itemId, action, successMessage) => {
    setUpdatingItemId(itemId)
    try {
      await action()
      if (successMessage) showToast(successMessage)
    } catch (requestError) {
      showToast(getErrorMessage(requestError), 'error')
    } finally {
      setUpdatingItemId(null)
    }
  }

  const handleQuantityChange = (itemId, quantity) => runUpdate(itemId, () => updateItem(itemId, quantity))
  const handleRemove = (item) =>
    runUpdate(item.id, () => removeItem(item.id), `${item.variant.product_name} removed from your bag.`)

  const hasProblem = cart.items.some(
    (item) => !item.variant.is_available || item.quantity > item.variant.stock_quantity,
  )

  if (isLoading && cart.items.length === 0) return <PageLoader label="Loading your bag…" />

  return (
    <div className="page-container py-6 sm:py-8">
      {cart.items.length > 0 && <CheckoutSteps current={0} />}
      <h1 className="section-title mb-4 sm:mb-6">Your bag</h1>
      {error && <ErrorMessage error={error} onRetry={refreshCart} />}
      {!error && cart.items.length === 0 && (
        <EmptyState
          title="Your bag is empty"
          message="Explore our bestsellers and find something you love."
          action={<Button to="/shop">Start shopping</Button>}
        />
      )}
      {cart.items.length > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
          <ul className="divide-y divide-line border-y border-line">
            {cart.items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                isUpdating={updatingItemId === item.id}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemove}
              />
            ))}
          </ul>
          <div className="lg:sticky lg:top-40 lg:self-start">
            <OrderSummary totals={{ subtotal: cart.subtotal }}>
              <FreeShippingProgress subtotal={cart.subtotal} />
              <p className="text-xs text-muted">Coupons and shipping are applied at checkout.</p>
              {hasProblem && (
                <p className="text-xs font-medium text-danger">Please fix the highlighted items before checking out.</p>
              )}
              <Button to={hasProblem ? undefined : '/checkout'} disabled={hasProblem} variant="accent" fullWidth size="lg">
                Checkout
              </Button>
            </OrderSummary>
          </div>
        </div>
      )}
    </div>
  )
}
