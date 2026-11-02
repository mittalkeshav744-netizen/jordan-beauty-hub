import { Link } from 'react-router'

import ErrorMessage from '../../components/common/ErrorMessage'
import Skeleton from '../../components/common/Skeleton'
import StatusBadge from '../../components/common/StatusBadge'
import FaIcon from '../../components/manage/FaIcon'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import ManagePanel from '../../components/manage/ManagePanel'
import ManageStatCard from '../../components/manage/ManageStatCard'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { portalService } from '../../services/portalService'
import { formatDate, formatPrice } from '../../utils/format'

function greeting(name) {
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${hello}, ${name}` : hello
}

const TONE = {
  warning: 'border-warning/30 bg-warning-soft text-warning',
  danger: 'border-danger/30 bg-danger-soft text-danger',
  accent: 'border-accent/30 bg-accent-soft text-berry',
}

const PIPELINE = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

const QUICK_LINKS = [
  { to: '/manage/orders?status=pending', label: 'Pending orders', hint: 'Confirm COD checkouts', icon: 'orders' },
  { to: '/manage/products?low_stock=1', label: 'Low stock', hint: 'Restock before it sells out', icon: 'products' },
  { to: '/manage/reviews?approved=0', label: 'Reviews waiting', hint: 'Approve or hide', icon: 'reviews' },
  { to: '/manage/coupons', label: 'New coupon', hint: 'Give the next order a reason', icon: 'coupons' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, error, reload } = useApi(() => portalService.dashboard(), [])

  if (isLoading) return <Skeleton className="h-72 w-full" />
  if (error) return <ErrorMessage error={error} onRetry={reload} />

  const attention = data.attention || []
  const recent = data.recent_orders || []
  const breakdown = data.status_breakdown || {}
  const pipelineMax = Math.max(1, ...PIPELINE.map((step) => breakdown[step.key] ?? 0))

  return (
    <section aria-labelledby="manage-dash-title">
      <ManagePageHeader
        title={greeting(user?.first_name)}
        description="Today’s counter snapshot — orders, stock, and what still needs a decision."
        eyebrow="Today at the counter"
      />

      <section className="manage-panel relative mb-6 overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cream via-surface to-accent-soft/40"
        />
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-8 h-40 w-40 rounded-full bg-accent/15" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-berry uppercase">
              Delivered revenue today
            </p>
            <p id="manage-dash-title" className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              {formatPrice(data.revenue_today)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {data.orders_today} order{data.orders_today === 1 ? '' : 's'} placed today
            </p>
          </div>
          <Link
            to="/manage/orders"
            className="inline-flex min-h-10 items-center gap-2 rounded-control bg-berry px-4 text-sm font-semibold text-white hover:bg-berry-hover"
          >
            <FaIcon icon="orders" className="h-3.5 w-3.5" />
            All orders
          </Link>
        </div>
      </section>

      <section aria-label="Quick links" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="manage-kpi block px-4 py-4"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-accent-soft text-berry">
              <FaIcon icon={link.icon} className="h-4 w-4" />
            </span>
            <p className="mt-3 font-display text-lg font-semibold text-ink">{link.label}</p>
            <p className="mt-1 text-xs text-ink-soft">{link.hint}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          <ManagePanel title="Needs attention" aria-labelledby="attention-title">
            <h2 id="attention-title" className="sr-only">
              Needs attention
            </h2>
            {attention.length === 0 ? (
              <div className="px-4 py-8 text-sm text-muted sm:px-5">
                <p className="font-medium text-ink">You’re clear for now.</p>
                <p className="mt-1">No pending orders, low stock, or reviews waiting.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {attention.map((item) => (
                  <li key={item.key}>
                    <Link to={item.to} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-cream/80 sm:px-5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{item.label}</p>
                        <p className="text-xs text-muted">{item.detail}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-control border px-2 py-1 text-[0.65rem] font-semibold tracking-wide uppercase ${
                          TONE[item.tone] || TONE.accent
                        }`}
                      >
                        Open
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ManagePanel>

          <ManagePanel
            title="Order pipeline"
            description="Tap a status to filter the orders list."
            bodyClassName="p-4 sm:p-5"
            aria-labelledby="pipeline-title"
          >
            <h2 id="pipeline-title" className="sr-only">
              Order pipeline
            </h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PIPELINE.map((step) => {
                const count = breakdown[step.key] ?? 0
                return (
                  <li key={step.key}>
                    <Link
                      to={`/manage/orders?status=${step.key}`}
                      className="block rounded-control border border-line bg-studio/40 px-3 py-2.5 text-sm hover:border-accent/40 hover:bg-accent-soft/50"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-ink-soft">{step.label}</span>
                        <span className="font-display text-lg font-semibold text-ink">{count}</span>
                      </span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-subtle">
                        <span
                          className="block h-full rounded-full bg-berry"
                          style={{ width: `${Math.round((count / pipelineMax) * 100)}%` }}
                        />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </ManagePanel>

          <ManagePanel
            title="Recent orders"
            actions={
              <Link to="/manage/orders" className="text-xs font-semibold text-berry hover:underline">
                View all
              </Link>
            }
            aria-labelledby="recent-orders-title"
          >
            <h2 id="recent-orders-title" className="sr-only">
              Recent orders
            </h2>
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted sm:px-5">
                No orders yet — they’ll show up here as soon as customers check out.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((order) => (
                  <li key={order.number}>
                    <Link
                      to={`/manage/orders/${order.number}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-cream/80 sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold break-all">{order.number}</p>
                        <p className="text-xs text-muted">
                          {order.customer_name || order.customer_email} · {formatDate(order.created_at)} ·{' '}
                          {order.item_count} item{order.item_count === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={order.status} label={order.status_display} />
                        <span className="text-sm font-semibold tabular-nums">{formatPrice(order.grand_total)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ManagePanel>
        </div>

        <div className="space-y-3">
          <ManageStatCard label="Orders today" value={data.orders_today} to="/manage/orders" icon="orders" />
          <ManageStatCard label="Orders this week" value={data.orders_this_week} to="/manage/orders" icon="orders" />
          <ManageStatCard
            label="Open orders"
            value={data.open_orders}
            hint="Pending through shipped"
            to="/manage/orders?status=pending"
            icon="orders"
          />
          <ManageStatCard
            label="Revenue (30 days)"
            value={formatPrice(data.revenue_30d)}
            hint="Delivered orders"
            featured
            icon="tag"
          />
          <div className="grid grid-cols-2 gap-3">
            <ManageStatCard label="Customers" value={data.customers} to="/manage/customers" icon="customers" />
            <ManageStatCard label="Live products" value={data.active_products} to="/manage/products" icon="products" />
            <ManageStatCard label="Active coupons" value={data.active_coupons} to="/manage/coupons" icon="coupons" />
            <ManageStatCard
              label="Newsletter"
              value={data.newsletter_subscribers}
              to="/manage/newsletter"
              icon="mail"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
