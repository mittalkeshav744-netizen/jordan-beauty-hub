import { useStoreSettings } from '../../hooks/useStoreSettings'
import { formatPrice } from '../../utils/format'

/** "Add ₹X more for free delivery". Shown only when the shop charges delivery below a threshold. */
export default function FreeShippingProgress({ subtotal }) {
  const settings = useStoreSettings()
  const fee = Number(settings?.shipping_flat_fee ?? 0)
  const threshold = Number(settings?.free_shipping_threshold ?? 0)
  if (fee === 0 || threshold === 0) return null

  // Display hint only: the real shipping charge is calculated by the server at checkout.
  const amount = Number(subtotal)
  const remaining = Math.max(0, threshold - amount)
  const percent = Math.min(100, Math.round((amount / threshold) * 100))

  return (
    <div className="space-y-2">
      <p className="text-sm">
        {remaining > 0 ? (
          <>
            Add <strong>{formatPrice(remaining.toFixed(2))}</strong> more to get free delivery.
          </>
        ) : (
          <strong className="text-success">You have unlocked free delivery!</strong>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Progress towards free delivery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-subtle"
      >
        <div className="h-full rounded-full bg-success transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
