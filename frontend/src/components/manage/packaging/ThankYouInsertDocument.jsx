import { STORE_NAME } from '../../../constants/navigation'
import { useStoreSettings, whatsappLink } from '../../../hooks/useStoreSettings'
import { normalizeOrderForPackaging } from '../../../utils/packagingOrder'
import Logo from '../../layout/Logo'

/**
 * Customer thank-you card for the parcel. No prices or internal notes.
 */
export default function ThankYouInsertDocument({ order, className = '' }) {
  const pack = normalizeOrderForPackaging(order)
  const settings = useStoreSettings()
  const chatLink = whatsappLink(
    settings,
    `Hi ${STORE_NAME}, I have a question about order ${pack.number}.`,
  )

  return (
    <article
      className={`thank-insert relative overflow-hidden bg-pack-ivory text-pack-charcoal ${className}`}
      data-packaging-doc="thank-you"
      aria-label={`Thank you insert for ${pack.number}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-8 h-36 w-36 rounded-full bg-pack-blush/50 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-pack-plum/15 blur-2xl"
      />

      <div className="relative z-[1] flex min-h-[22rem] flex-col items-center justify-between px-6 py-8 text-center sm:px-10 sm:py-10">
        <div>
          <Logo />
          <p className="mt-3 text-[0.65rem] font-semibold tracking-[0.22em] text-pack-plum uppercase">
            {STORE_NAME}
          </p>
        </div>

        <div className="my-6 max-w-md">
          <h1 className="font-display text-2xl font-bold tracking-[0.08em] text-pack-plum uppercase sm:text-3xl">
            Thank you for your order!
          </h1>
          <p className="mt-3 text-sm font-semibold text-pack-berry">
            Dear {pack.customerName},
          </p>
          <p className="mt-1 text-xs text-muted">Order {pack.number}</p>
          <p className="mt-5 text-sm leading-relaxed text-pack-charcoal/90">
            Thank you for choosing {STORE_NAME}.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-pack-charcoal/90">
            We are delighted to be a part of your beauty journey. We hope you love your purchase as
            much as we loved preparing it for you.
          </p>
          <p className="mt-5 font-display text-lg font-semibold text-pack-plum">
            Your Beauty, Your Glow.
          </p>
        </div>

        <div className="space-y-1 text-xs text-muted">
          {chatLink ? (
            <p>
              Need help?{' '}
              <a href={chatLink} className="font-semibold text-pack-berry underline">
                Chat with us on WhatsApp
              </a>
            </p>
          ) : (
            <p>Questions? Reach out through the Jordan Beauty Hub website.</p>
          )}
          <p className="tracking-[0.18em] text-pack-plum uppercase">{STORE_NAME}</p>
        </div>
      </div>
    </article>
  )
}
