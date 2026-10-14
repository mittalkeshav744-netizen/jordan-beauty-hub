import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'

import OrderSummary from '../components/cart/OrderSummary'
import Button from '../components/common/Button'
import ErrorMessage from '../components/common/ErrorMessage'
import { PageLoader } from '../components/common/Spinner'
import AddressForm from '../components/forms/AddressForm'
import FormField from '../components/forms/FormField'
import { useApi } from '../hooks/useApi'
import { useCart } from '../hooks/useCart'
import { useToast } from '../hooks/useToast'
import { addressService } from '../services/authService'
import { orderService } from '../services/orderService'
import { getErrorMessage } from '../utils/errors'
import { formatPrice } from '../utils/format'

function AddressOption({ address, isSelected, onSelect }) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-card border p-4 text-sm ${
        isSelected ? 'border-ink bg-cream' : 'border-line hover:border-ink-soft'
      }`}
    >
      <input
        type="radio"
        name="address"
        checked={isSelected}
        onChange={() => onSelect(address.id)}
        className="mt-1 h-4 w-4 shrink-0 accent-accent"
      />
      <span className="min-w-0">
        <span className="block font-semibold">{address.full_name}</span>
        <span className="block text-ink-soft">
          {address.line1}
          {address.line2 && `, ${address.line2}`}, {address.city}, {address.state} {address.postal_code}
        </span>
        <span className="block text-muted">Phone: {address.phone}</span>
      </span>
    </label>
  )
}

function CouponForm({ appliedCode, onApply, onRemove }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isApplying, setIsApplying] = useState(false)

  const handleApply = async (event) => {
    event.preventDefault()
    if (!code.trim()) return
    setIsApplying(true)
    setError('')
    try {
      await onApply(code.trim())
      setCode('')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsApplying(false)
    }
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-control border border-success/30 bg-success-soft py-1 pr-1 pl-3 text-sm text-success">
        <span className="min-w-0">
          Coupon <strong className="break-all">{appliedCode}</strong> applied
        </span>
        <button type="button" onClick={onRemove} className="min-h-11 shrink-0 px-2 text-xs underline">
          Remove
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleApply} className="flex items-start gap-2">
      <FormField
        label="Coupon code"
        className="min-w-0 flex-1"
        value={code}
        autoCapitalize="characters"
        enterKeyHint="go"
        error={error}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        autoComplete="off"
      />
      <Button type="submit" variant="outline" className="mt-[1.4rem] shrink-0 px-4" isLoading={isApplying}>
        Apply
      </Button>
    </form>
  )
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { cart, isLoading: isCartLoading, clearLocalCart } = useCart()
  const addresses = useApi(() => addressService.list())
  const quote = useApi(() => orderService.quote(''))

  const [chosenAddressId, setChosenAddressId] = useState(null)
  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [note, setNote] = useState('')
  const [submitError, setSubmitError] = useState(null)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  // One key per checkout visit: a double click or network retry can't create two orders.
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const addressList = addresses.data ?? []
  const defaultAddress = addressList.find((address) => address.is_default) ?? addressList[0]
  const selectedAddressId = chosenAddressId ?? defaultAddress?.id
  const showAddressForm = isAddingAddress || (!addresses.isLoading && addressList.length === 0)

  if (addresses.isLoading || quote.isLoading || isCartLoading) return <PageLoader label="Preparing checkout…" />
  if (cart.items.length === 0 && !isPlacingOrder) return <Navigate to="/cart" replace />

  const handleAddressCreated = async (values) => {
    const created = await addressService.create(values)
    addresses.setData([...addressList.map((a) => (created.is_default ? { ...a, is_default: false } : a)), created])
    setChosenAddressId(created.id)
    setIsAddingAddress(false)
  }

  const applyCoupon = async (code) => {
    quote.setData(await orderService.quote(code))
    setCouponCode(code)
  }

  const removeCoupon = async () => {
    setCouponCode('')
    quote.setData(await orderService.quote(''))
  }

  const placeOrder = async () => {
    setIsPlacingOrder(true)
    setSubmitError(null)
    try {
      const order = await orderService.place({
        address_id: selectedAddressId,
        idempotency_key: idempotencyKey,
        coupon_code: couponCode,
        customer_note: note,
      })
      clearLocalCart()
      showToast(`Order ${order.number} placed successfully!`)
      navigate(`/account/orders/${order.number}`, { replace: true, state: { justPlaced: true } })
    } catch (error) {
      setSubmitError(error)
      setIsPlacingOrder(false)
    }
  }

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="section-title mb-4 sm:mb-6">Checkout</h1>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="address-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="address-heading" className="text-sm font-semibold tracking-widest uppercase">
                1. Delivery address
              </h2>
              {!showAddressForm && (
                <Button variant="ghost" size="sm" onClick={() => setIsAddingAddress(true)}>
                  + Add new
                </Button>
              )}
            </div>
            {addresses.error && <ErrorMessage error={addresses.error} onRetry={addresses.reload} />}
            {showAddressForm ? (
              <AddressForm
                onSubmit={handleAddressCreated}
                onCancel={addressList.length ? () => setIsAddingAddress(false) : undefined}
                submitLabel="Deliver here"
              />
            ) : (
              <div className="grid gap-3">
                {addressList.map((address) => (
                  <AddressOption
                    key={address.id}
                    address={address}
                    isSelected={address.id === selectedAddressId}
                    onSelect={setChosenAddressId}
                  />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="payment-heading" className="space-y-3">
            <h2 id="payment-heading" className="text-sm font-semibold tracking-widest uppercase">
              2. Payment
            </h2>
            <div className="rounded-card border border-ink bg-cream p-4 text-sm">
              <p className="font-semibold">Cash on delivery</p>
              <p className="text-muted">Pay in cash when your order is delivered.</p>
            </div>
          </section>

          <section aria-labelledby="items-heading" className="space-y-3">
            <h2 id="items-heading" className="text-sm font-semibold tracking-widest uppercase">
              3. Review items
            </h2>
            <ul className="divide-y divide-line rounded-card border border-line">
              {cart.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 p-4 text-sm">
                  <span className="min-w-0">
                    {item.variant.product_name} <span className="text-muted">({item.variant.name})</span> ×{' '}
                    {item.quantity}
                  </span>
                  <span className="shrink-0 font-medium whitespace-nowrap">{formatPrice(item.line_total)}</span>
                </li>
              ))}
            </ul>
            <FormField
              label="Order note (optional)"
              as="textarea"
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </section>
        </div>

        <div className="min-w-0 space-y-4 lg:sticky lg:top-40 lg:self-start">
          {quote.error && <ErrorMessage error={quote.error} onRetry={quote.reload} />}
          {quote.data && (
            <OrderSummary totals={quote.data}>
              <CouponForm appliedCode={couponCode} onApply={applyCoupon} onRemove={removeCoupon} />
              {submitError && <ErrorMessage error={submitError} />}
              <Button
                variant="accent"
                size="lg"
                fullWidth
                isLoading={isPlacingOrder}
                disabled={!selectedAddressId || showAddressForm}
                onClick={placeOrder}
              >
                Place order
              </Button>
              {!selectedAddressId && <p className="text-xs text-muted">Add a delivery address to continue.</p>}
            </OrderSummary>
          )}
        </div>
      </div>
    </div>
  )
}
