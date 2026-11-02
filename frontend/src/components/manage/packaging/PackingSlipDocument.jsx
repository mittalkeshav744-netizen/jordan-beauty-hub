import { STORE_NAME } from '../../../constants/navigation'
import { formatDate } from '../../../utils/format'
import {
  formatShippingBlock,
  normalizeOrderForPackaging,
  totalUnits,
} from '../../../utils/packagingOrder'
import Logo from '../../layout/Logo'

/**
 * Internal packing slip for staff. Never shows prices or payment details.
 */
export default function PackingSlipDocument({ order, className = '' }) {
  const pack = normalizeOrderForPackaging(order)
  const addressLines = formatShippingBlock(pack)
  const units = totalUnits(pack.items)

  return (
    <article
      className={`pack-slip bg-surface text-pack-charcoal ${className}`}
      data-packaging-doc="slip"
      aria-label={`Packing slip for ${pack.number}`}
    >
      <header className="pack-slip__header flex flex-wrap items-start justify-between gap-4 border-b border-pack-blush pb-4">
        <div>
          <Logo />
          <p className="mt-2 text-[0.65rem] font-semibold tracking-[0.2em] text-pack-plum uppercase">
            {STORE_NAME}
          </p>
        </div>
        <div className="text-right">
          <h1 className="font-display text-xl font-bold tracking-[0.12em] text-pack-plum uppercase sm:text-2xl">
            Packing slip
          </h1>
          <p className="mt-2 text-sm font-semibold break-all text-pack-charcoal">{pack.number}</p>
          <p className="text-xs text-muted">{formatDate(pack.createdAt) || '—'}</p>
        </div>
      </header>

      <section className="mt-5" aria-labelledby={`ship-to-${pack.number}`}>
        <h2 id={`ship-to-${pack.number}`} className="text-xs font-semibold tracking-[0.16em] text-pack-plum uppercase">
          Customer / ship to
        </h2>
        <div className="mt-2 text-sm leading-relaxed">
          <p className="font-semibold">{pack.customerName}</p>
          {pack.phone ? <p>{pack.phone}</p> : null}
          {addressLines.length > 0 ? (
            addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))
          ) : (
            <p className="text-muted">No shipping address on file.</p>
          )}
        </div>
        {pack.customerNote ? (
          <p className="mt-3 rounded-control border border-pack-blush/60 bg-pack-ivory px-3 py-2 text-sm">
            <span className="font-semibold text-pack-plum">Packing note: </span>
            {pack.customerNote}
          </p>
        ) : null}
      </section>

      <section className="mt-6" aria-labelledby={`items-${pack.number}`}>
        <h2 id={`items-${pack.number}`} className="sr-only">
          Order items
        </h2>
        <div className="overflow-x-auto">
          <table className="pack-slip__table w-full min-w-[28rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-pack-plum text-[0.65rem] tracking-[0.12em] text-pack-plum uppercase">
                <th className="py-2 pr-2 font-semibold">#</th>
                <th className="py-2 pr-2 font-semibold">Product</th>
                <th className="py-2 pr-2 font-semibold">SKU</th>
                <th className="py-2 pr-2 font-semibold">Variant</th>
                <th className="py-2 pr-2 font-semibold">Qty</th>
                <th className="py-2 font-semibold">Packed</th>
              </tr>
            </thead>
            <tbody>
              {pack.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-muted">
                    No line items on this order.
                  </td>
                </tr>
              ) : (
                pack.items.map((item) => (
                  <tr key={item.id} className="pack-slip__row border-b border-line align-top">
                    <td className="py-2.5 pr-2">{item.serial}</td>
                    <td className="py-2.5 pr-2 font-medium break-words">{item.productName}</td>
                    <td className="py-2.5 pr-2 break-all text-muted">{item.sku}</td>
                    <td className="py-2.5 pr-2 break-words">{item.variantName}</td>
                    <td className="py-2.5 pr-2 font-semibold">{item.quantity}</td>
                    <td className="py-2.5">
                      <span
                        aria-hidden="true"
                        className="inline-block h-4 w-4 rounded-sm border border-pack-plum"
                      />
                      <span className="sr-only">Packed checkbox</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm font-semibold text-pack-charcoal">
          Total units to pack: {units}
        </p>
      </section>

      <footer className="mt-8 border-t border-pack-blush pt-4 text-center text-xs tracking-wide text-pack-plum">
        Packed with care by {STORE_NAME}.
      </footer>
    </article>
  )
}
