import { useState } from 'react'
import { Link } from 'react-router'

import Button from '../common/Button'
import ErrorMessage from '../common/ErrorMessage'
import Skeleton from '../common/Skeleton'
import StatusBadge from '../common/StatusBadge'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'
import { formatDate, formatPrice } from '../../utils/format'
import FaIcon from './FaIcon'
import PackagingDocumentsModal from './packaging/PackagingDocumentsModal'

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

function whatsappUrl(phone, message) {
  const digits = digitsOnly(phone)
  if (!digits) return null
  const withCountry = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`
}

export default function OrderDetailContent({ number, onCustomerOpen }) {
  const { showToast } = useToast()
  const { data: order, isLoading, error, reload, setData } = useApi(
    () => portalService.getOrder(number),
    [number],
  )
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState('')
  const [packagingOpen, setPackagingOpen] = useState(false)
  const [shipmentDraft, setShipmentDraft] = useState(null)
  const [savingShipment, setSavingShipment] = useState(false)

  const updateStatus = async (nextStatus) => {
    if (!nextStatus) return
    setSaving(nextStatus)
    try {
      const updated = await portalService.updateOrderStatus(number, { status: nextStatus, note })
      setData(updated)
      setNote('')
      showToast(`Order marked ${updated.status_display}.`, 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not update status.', 'error')
    } finally {
      setSaving('')
    }
  }

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.number)
      showToast('Order number copied.', 'success')
    } catch {
      showToast('Could not copy. Select the number manually.', 'error')
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (error) return <ErrorMessage error={error} onRetry={reload} />

  const address = order.shipping_address || {}
  const phone = address.phone || ''
  const wa = whatsappUrl(
    phone,
    `Hi ${address.full_name || 'there'}, this is Jordan Beauty Hub about order ${order.number}.`,
  )

  const shipment = shipmentDraft ?? {
    courier_name: order.courier_name || '',
    tracking_number: order.tracking_number || '',
    tracking_url: order.tracking_url || '',
  }

  const saveShipment = async (event) => {
    event.preventDefault()
    setSavingShipment(true)
    try {
      const updated = await portalService.setOrderShipment(number, {
        courier_name: shipment.courier_name.trim(),
        tracking_number: shipment.tracking_number.trim(),
        tracking_url: shipment.tracking_url.trim(),
      })
      setData(updated)
      setShipmentDraft(null)
      showToast('Shipment details saved.', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not save shipment.', 'error')
    } finally {
      setSavingShipment(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold break-all">{order.number}</p>
          <p className="mt-1 text-sm text-muted">
            {formatDate(order.created_at)} ·{' '}
            {order.customer_id ? (
              onCustomerOpen ? (
                <button
                  type="button"
                  onClick={() => onCustomerOpen(order.customer_id)}
                  className="btn-text px-1 text-accent hover:text-accent"
                >
                  {order.customer_email}
                </button>
              ) : (
                <Link to={`/manage/customers/${order.customer_id}`} className="text-accent hover:underline">
                  {order.customer_email}
                </Link>
              )
            ) : (
              order.customer_email
            )}
          </p>
        </div>
        <StatusBadge status={order.status} label={order.status_display} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyNumber}
          className="inline-flex min-h-10 items-center gap-2 rounded-control border border-line bg-canvas px-3 text-sm font-medium hover:bg-subtle"
        >
          <FaIcon icon="copy" className="h-3.5 w-3.5 text-ink-soft" />
          Copy number
        </button>
        {phone ? (
          <a
            href={`tel:${digitsOnly(phone)}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-control border border-line bg-canvas px-3 text-sm font-medium hover:bg-subtle"
          >
            <FaIcon icon="phone" className="h-3.5 w-3.5 text-ink-soft" />
            Call customer
          </a>
        ) : null}
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-control border border-line bg-canvas px-3 text-sm font-medium hover:bg-subtle"
          >
            <FaIcon icon="mail" className="h-3.5 w-3.5 text-ink-soft" />
            WhatsApp
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => setPackagingOpen(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-control bg-ink px-3 text-sm font-semibold text-white hover:bg-ink-soft"
        >
          <FaIcon icon="templates" className="h-3.5 w-3.5" />
          Packaging documents
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-subtle/40 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FaIcon icon="truck" className="h-3.5 w-3.5 text-berry" />
            Ship to
          </h3>
          <p className="mt-2 text-sm">
            {address.full_name}
            <br />
            {address.line1}
            {address.line2 ? (
              <>
                <br />
                {address.line2}
              </>
            ) : null}
            <br />
            {address.city}, {address.state} {address.postal_code}
            <br />
            {address.phone}
          </p>
          <p className="mt-3 text-sm text-muted">
            Payment: {order.payment_method} ({order.payment_status})
          </p>
          {order.customer_note ? (
            <p className="mt-2 text-sm">
              <span className="font-semibold">Note:</span> {order.customer_note}
            </p>
          ) : null}
        </div>

        <div className="rounded-card border border-line bg-subtle/40 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FaIcon icon="rupee" className="h-3.5 w-3.5 text-berry" />
            Totals
          </h3>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Discount</dt>
              <dd>{formatPrice(order.discount_total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>{formatPrice(order.shipping_total)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Grand total</dt>
              <dd>{formatPrice(order.grand_total)}</dd>
            </div>
          </dl>
          {order.coupon_code ? <p className="mt-2 text-xs text-muted">Coupon {order.coupon_code}</p> : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-subtle/80 text-xs tracking-wide uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Qty</th>
              <th className="px-4 py-3 font-semibold">Line</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-xs text-muted">
                    {item.variant_name} · {item.sku}
                  </p>
                </td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">{formatPrice(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={saveShipment} className="rounded-card border border-line bg-subtle/40 p-4 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FaIcon icon="sliders" className="h-3.5 w-3.5 text-berry" />
          Courier & tracking
        </h3>
        <p className="text-xs text-muted">
          Enter tracking manually now. When your delivery API keys are ready, auto-create can plug in here.
        </p>
        <label className="block text-sm" htmlFor="courier-name">
          Courier name
          <input
            id="courier-name"
            value={shipment.courier_name}
            onChange={(event) =>
              setShipmentDraft({ ...shipment, courier_name: event.target.value })
            }
            placeholder="e.g. Delhivery"
            className="mt-1 min-h-11 w-full rounded-control border border-line bg-canvas px-3 text-sm"
          />
        </label>
        <label className="block text-sm" htmlFor="tracking-number">
          Tracking number
          <input
            id="tracking-number"
            value={shipment.tracking_number}
            onChange={(event) =>
              setShipmentDraft({ ...shipment, tracking_number: event.target.value })
            }
            className="mt-1 min-h-11 w-full rounded-control border border-line bg-canvas px-3 text-sm"
          />
        </label>
        <label className="block text-sm" htmlFor="tracking-url">
          Tracking URL
          <input
            id="tracking-url"
            type="url"
            value={shipment.tracking_url}
            onChange={(event) =>
              setShipmentDraft({ ...shipment, tracking_url: event.target.value })
            }
            placeholder="https://"
            className="mt-1 min-h-11 w-full rounded-control border border-line bg-canvas px-3 text-sm"
          />
        </label>
        <Button type="submit" variant="outline" isLoading={savingShipment}>
          <FaIcon icon="check" className="mr-1.5 h-3.5 w-3.5" />
          Save shipment
        </Button>
      </form>

      {order.allowed_next_statuses?.length > 0 ? (
        <div className="rounded-card border border-line bg-subtle/40 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FaIcon icon="check" className="h-3.5 w-3.5 text-berry" />
            Update status
          </h3>
          <p className="mt-1 text-xs text-muted">Each order can only move to the next allowed status.</p>
          <label className="mt-3 block text-sm" htmlFor="status-note">
            Optional note
            <input
              id="status-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Handed to courier"
              className="mt-1 min-h-11 w-full rounded-control border border-line bg-canvas px-3 text-sm"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {order.allowed_next_statuses.map((value) => (
              <Button
                key={value}
                type="button"
                variant={value === 'cancelled' ? 'danger' : 'primary'}
                isLoading={saving === value}
                disabled={Boolean(saving)}
                onClick={() => updateStatus(value)}
                className="capitalize"
              >
                Mark {value}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FaIcon icon="clock" className="h-3.5 w-3.5 text-berry" />
          Status history
        </h3>
        <ol className="mt-2 space-y-2 border-l border-line pl-4">
          {order.status_history.map((entry, index) => (
            <li key={`${entry.created_at}-${index}`} className="text-sm">
              <p className="font-medium capitalize">
                {entry.from_status || '—'} → {entry.to_status}
              </p>
              <p className="text-xs text-muted">
                {formatDate(entry.created_at)}
                {entry.note ? ` · ${entry.note}` : ''}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <PackagingDocumentsModal
        isOpen={packagingOpen}
        onClose={() => setPackagingOpen(false)}
        orders={[order]}
      />
    </div>
  )
}
