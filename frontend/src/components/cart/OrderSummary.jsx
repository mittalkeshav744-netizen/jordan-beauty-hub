import { formatPrice } from '../../utils/format'

function SummaryRow({ label, value, emphasis = false, accent = false }) {
  return (
    <div className={`flex justify-between gap-4 ${emphasis ? 'border-t border-line pt-3 text-base font-semibold' : 'text-sm'}`}>
      <dt className={`min-w-0 ${emphasis ? '' : 'text-ink-soft'}`}>{label}</dt>
      <dd className={`shrink-0 text-right whitespace-nowrap ${accent ? 'text-success' : ''}`}>{value}</dd>
    </div>
  )
}

/** totals: { subtotal, discount_total, shipping_total, grand_total, coupon_code } */
export default function OrderSummary({ totals, title = 'Order summary', children }) {
  const discount = Number(totals.discount_total ?? 0)
  const hasShipping = totals.shipping_total !== undefined

  return (
    <section aria-label={title} className="space-y-4 rounded-card border border-line bg-cream p-4 sm:p-5">
      <h2 className="text-sm font-semibold tracking-widest uppercase">{title}</h2>
      <dl className="space-y-2">
        <SummaryRow label="Subtotal" value={formatPrice(totals.subtotal)} />
        {discount > 0 && (
          <SummaryRow
            label={`Discount${totals.coupon_code ? ` (${totals.coupon_code})` : ''}`}
            value={`− ${formatPrice(totals.discount_total)}`}
            accent
          />
        )}
        {hasShipping && (
          <SummaryRow
            label="Shipping"
            value={Number(totals.shipping_total) > 0 ? formatPrice(totals.shipping_total) : 'Free'}
          />
        )}
        <SummaryRow
          label="Total"
          value={formatPrice(totals.grand_total ?? totals.subtotal)}
          emphasis
        />
      </dl>
      {children}
    </section>
  )
}
