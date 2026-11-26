import { useState } from 'react'

import CartItem from '../components/cart/CartItem'
import CartUpsellShelf from '../components/cart/CartUpsellShelf'
import CheckoutSteps from '../components/cart/CheckoutSteps'
import FreeShippingProgress from '../components/cart/FreeShippingProgress'
import OrderSummary from '../components/cart/OrderSummary'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import ErrorMessage from '../components/common/ErrorMessage'
import { PageLoader } from '../components/common/Spinner'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useToast } from '../hooks/useToast'
import { getErrorMessage } from '../utils/errors'

export default function CartPage() {
  const { isAuthenticated } = useAuth()
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
    <div className="page-container py-5 sm:py-8">
      {cart.items.length > 0 && <CheckoutSteps current={0} />}
      <h1 className="section-title mb-3 sm:mb-6">Your bag</h1>
      {error && <ErrorMessage error={error} onRetry={refreshCart} />}
      {!error && cart.items.length === 0 && (
        <EmptyState
          title="Your bag is empty"
          message="Explore our bestsellers and find something you love."
          action={<Button to="/shop">Start shopping</Button>}
        />
      )}
      {cart.items.length > 0 && (
        <div className="space-y-8">
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
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
            <aside className="lg:sticky lg:top-28 lg:z-10 lg:self-start">
              <OrderSummary totals={{ subtotal: cart.subtotal }}>
                <FreeShippingProgress subtotal={cart.subtotal} />
                <p className="text-xs text-muted">Coupons and shipping are applied at checkout.</p>
                {hasProblem && (
                  <p className="text-xs font-medium text-danger">Please fix the highlighted items before checking out.</p>
                )}
                {!isAuthenticated ? (
                  <p className="text-xs text-muted">
                    You can keep shopping as a guest. Sign in is only needed to place the order.
                  </p>
                ) : null}
                <Button
                  to={hasProblem ? undefined : isAuthenticated ? '/checkout' : '/login'}
                  state={isAuthenticated || hasProblem ? undefined : { from: '/checkout' }}
                  disabled={hasProblem}
                  variant="accent"
                  fullWidth
                  size="lg"
                >
                  {isAuthenticated ? 'Checkout' : 'Sign in to checkout'}
                </Button>
              </OrderSummary>
            </aside>
          </div>
          <CartUpsellShelf subtotal={cart.subtotal} />
        </div>
      )}
    </div>
  )
}
