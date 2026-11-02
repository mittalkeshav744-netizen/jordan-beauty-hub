import ErrorMessage from '../../components/common/ErrorMessage'
import Skeleton from '../../components/common/Skeleton'
import FaIcon from '../../components/manage/FaIcon'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import { useApi } from '../../hooks/useApi'
import { portalService } from '../../services/portalService'
import { formatPrice } from '../../utils/format'

export default function SettingsPage() {
  const { data, isLoading, error, reload } = useApi(() => portalService.settings(), [])

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (error) return <ErrorMessage error={error} onRetry={reload} />

  const rows = [
    { label: 'Store name', value: data.store_name, icon: 'store' },
    { label: 'Currency', value: data.currency, icon: 'tag' },
    { label: 'Flat shipping fee', value: formatPrice(data.shipping_flat_fee), icon: 'orders' },
    { label: 'Free shipping threshold', value: formatPrice(data.free_shipping_threshold), icon: 'orders' },
    { label: 'WhatsApp number', value: data.whatsapp_number || 'Not set', icon: 'mail' },
    { label: 'Beauty chat (Gemini)', value: data.chat_enabled ? 'Configured' : 'Not configured', icon: 'looks' },
  ]

  return (
    <section aria-labelledby="manage-settings-title">
      <ManagePageHeader
        title="Settings"
        description="Live store configuration. Shipping, WhatsApp and Gemini keys live in backend/.env."
      />

      <dl className="manage-panel divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <dt className="flex items-center gap-2 text-muted">
              <FaIcon icon={row.icon} className="h-3.5 w-3.5 text-accent" />
              {row.label}
            </dt>
            <dd className="font-medium text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-sm text-ink-soft">{data.notes}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-btn border border-line bg-surface px-4 text-sm font-semibold shadow-[0_1px_2px_rgb(17_17_17/0.04)] transition-colors hover:border-ink hover:bg-ink hover:text-white"
        >
          <FaIcon icon="store" className="h-3.5 w-3.5" />
          View storefront
        </a>
      </div>

      <div className="mt-8 rounded-card border border-line bg-canvas p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <FaIcon icon="check" className="h-3.5 w-3.5 text-accent" />
          Owner checklist
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>Confirm pending COD orders every morning</li>
          <li>Restock anything marked low stock before ads or launches</li>
          <li>Approve product reviews so they appear on the shop</li>
          <li>Keep WhatsApp and beauty chat keys set for customer support</li>
        </ul>
      </div>
    </section>
  )
}
