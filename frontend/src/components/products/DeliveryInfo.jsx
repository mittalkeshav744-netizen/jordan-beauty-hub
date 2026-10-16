import { useState } from 'react'
import { Link } from 'react-router'

import { useForm } from '../../hooks/useForm'
import { useStoreSettings, whatsappLink } from '../../hooks/useStoreSettings'
import { formatPrice } from '../../utils/format'
import { validPinCode } from '../../utils/validators'
import Button from '../common/Button'
import FormField from '../forms/FormField'

function shippingMessage(settings) {
  if (!settings) return null
  const fee = Number(settings.shipping_flat_fee)
  const threshold = Number(settings.free_shipping_threshold)
  if (fee === 0) return 'Free delivery on every order'
  if (threshold > 0) return `Free delivery on orders above ${formatPrice(settings.free_shipping_threshold)}`
  return `Delivery charge ${formatPrice(settings.shipping_flat_fee)} per order`
}

/** Every valid Indian PIN code is served, so the check only validates the format. */
function PinCodeCheck() {
  const [checkedPin, setCheckedPin] = useState('')
  const form = useForm({ pin: '' }, (values) => ({ pin: validPinCode(values.pin) }))
  const pinField = form.field('pin')

  return (
    <div className="space-y-2">
      <form
        onSubmit={form.handleSubmit((values) => setCheckedPin(values.pin.trim()))}
        noValidate
        className="flex items-start gap-2"
      >
        <FormField
          label="Check delivery"
          className="min-w-0 flex-1"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          placeholder="Enter PIN code"
          {...pinField}
          onChange={(event) => {
            setCheckedPin('')
            pinField.onChange(event)
          }}
        />
        <Button type="submit" variant="outline" className="mt-[1.4rem] shrink-0 px-4">
          Check
        </Button>
      </form>
      <p role="status" className="text-sm text-success empty:hidden">
        {checkedPin && `Delivery available to ${checkedPin}. Pay in cash when your order arrives.`}
      </p>
    </div>
  )
}

function InfoLine({ children }) {
  return (
    <li className="flex gap-2">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
      <span className="min-w-0">{children}</span>
    </li>
  )
}

export default function DeliveryInfo({ productName }) {
  const settings = useStoreSettings()
  const shipping = shippingMessage(settings)
  const chatLink = whatsappLink(settings, `Hi, I have a question about ${productName}.`)

  return (
    <section aria-label="Delivery and returns" className="space-y-4 rounded-card border border-line p-4">
      <ul className="space-y-2 text-sm">
        <InfoLine>Cash on Delivery available across India</InfoLine>
        {shipping && <InfoLine>{shipping}</InfoLine>}
        <InfoLine>
          No returns. Damaged or wrong items are replaced.{' '}
          <Link to="/policies/returns" className="whitespace-nowrap text-accent underline-offset-2 hover:underline">
            Read policy
          </Link>
        </InfoLine>
      </ul>
      <PinCodeCheck />
      {chatLink && (
        <a
          href={chatLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          Questions? Chat with us on WhatsApp
        </a>
      )}
    </section>
  )
}
