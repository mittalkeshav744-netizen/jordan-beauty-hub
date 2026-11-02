import { useState } from 'react'

import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import Skeleton from '../../components/common/Skeleton'
import FaIcon from '../../components/manage/FaIcon'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import ManageToolbar from '../../components/manage/ManageToolbar'
import FormField from '../../components/forms/FormField'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'
import { formatDate, formatPrice } from '../../utils/format'
import { compactErrors, required, validMoney } from '../../utils/validators'

const PAGE_SIZE = 12

function emptyForm() {
  const local = new Date()
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset())
  return {
    code: '',
    description: '',
    discount_type: 'percentage',
    value: '10',
    min_order_amount: '0',
    max_discount_amount: '',
    valid_from: local.toISOString().slice(0, 16),
    valid_until: '',
    usage_limit: '',
    usage_limit_per_user: '',
    is_active: true,
  }
}

function validateCouponForm(form) {
  const errors = compactErrors({
    code: required(form.code, 'Code'),
    value: validMoney(form.value, 'Value'),
    min_order_amount: validMoney(form.min_order_amount || '0', 'Min order'),
    valid_from: required(form.valid_from, 'Valid from'),
  })
  if (form.discount_type === 'percentage') {
    const pct = Number(form.value)
    if (Number.isFinite(pct) && (pct <= 0 || pct > 100)) {
      errors.value = 'Percentage must be between 1 and 100.'
    }
  }
  if (form.valid_until && form.valid_from && new Date(form.valid_until) < new Date(form.valid_from)) {
    errors.valid_until = 'End date must be after the start date.'
  }
  if (String(form.max_discount_amount || '').trim()) {
    const maxError = validMoney(form.max_discount_amount, 'Max discount')
    if (maxError) errors.max_discount_amount = maxError
  }
  return errors
}

export default function CouponsPage() {
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()
  const { data, isLoading, error, reload, setData } = useApi(
    () => portalService.listCoupons({ page, page_size: PAGE_SIZE }),
    [page],
  )

  const results = data?.results || []

  const openCreate = () => {
    setForm(emptyForm())
    setFieldErrors({})
    setShowForm(true)
  }

  const patchForm = (patch) => {
    setForm((current) => ({ ...current, ...patch }))
    const cleared = Object.keys(patch)
    if (cleared.some((key) => fieldErrors[key])) {
      setFieldErrors((current) => {
        const next = { ...current }
        cleared.forEach((key) => {
          delete next[key]
        })
        return next
      })
    }
  }

  const createCoupon = async (event) => {
    event.preventDefault()
    const nextErrors = validateCouponForm(form)
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      showToast('Fix the highlighted fields, then create again.', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description,
        discount_type: form.discount_type,
        value: form.value,
        min_order_amount: form.min_order_amount || '0',
        max_discount_amount: form.max_discount_amount || null,
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
        usage_limit_per_user:
          form.usage_limit_per_user === '' ? null : Number(form.usage_limit_per_user),
        is_active: form.is_active,
      }
      const created = await portalService.createCoupon(payload)
      showToast(`Coupon ${created.code} created.`, 'success')
      setForm(emptyForm())
      setFieldErrors({})
      setShowForm(false)
      if (page === 1) {
        setData({
          ...data,
          count: (data?.count || 0) + 1,
          results: [created, ...results.filter((row) => row.id !== created.id)].slice(0, PAGE_SIZE),
        })
      } else {
        setPage(1)
      }
      reload()
    } catch (err) {
      const detail = err.response?.data
      let message = 'Could not create coupon.'
      if (detail && typeof detail === 'object') {
        if (detail.detail) message = String(detail.detail)
        else if (detail.errors) {
          const mapped = {}
          Object.entries(detail.errors).forEach(([key, value]) => {
            mapped[key] = Array.isArray(value) ? value[0] : String(value)
          })
          setFieldErrors(mapped)
          message = Object.values(mapped).join(' ')
        } else message = Object.values(detail).flat().join(' ') || message
      }
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (coupon) => {
    try {
      const updated = await portalService.updateCoupon(coupon.id, { is_active: !coupon.is_active })
      setData({
        ...data,
        results: results.map((row) => (row.id === coupon.id ? { ...row, ...updated } : row)),
      })
      showToast(updated.is_active ? 'Coupon activated.' : 'Coupon deactivated.', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not update coupon.', 'error')
    }
  }

  return (
    <section aria-labelledby="manage-coupons-title">
      <ManagePageHeader
        title="Coupons"
        description="Create and activate discount codes for checkout."
      />

      <ManageToolbar
        actions={
          <Button type="button" onClick={openCreate}>
            <FaIcon icon="plus" className="mr-2 h-3.5 w-3.5" />
            New coupon
          </Button>
        }
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="New coupon"
        size="wide"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" form="coupon-create-form" isLoading={saving}>
              Create coupon
            </Button>
          </>
        }
      >
        <form id="coupon-create-form" onSubmit={createCoupon} className="grid gap-3 sm:grid-cols-2" noValidate>
          <FormField
            label="Code"
            required
            error={fieldErrors.code}
            value={form.code}
            onChange={(event) => patchForm({ code: event.target.value })}
            className="uppercase"
            placeholder="SAVE10"
          />
          <FormField
            label="Description"
            value={form.description}
            onChange={(event) => patchForm({ description: event.target.value })}
          />
          <FormField
            label="Type"
            as="select"
            value={form.discount_type}
            onChange={(event) => patchForm({ discount_type: event.target.value })}
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </FormField>
          <FormField
            label="Value"
            required
            type="number"
            min="0"
            step="0.01"
            error={fieldErrors.value}
            value={form.value}
            onChange={(event) => patchForm({ value: event.target.value })}
          />
          <FormField
            label="Min order"
            type="number"
            min="0"
            step="0.01"
            error={fieldErrors.min_order_amount}
            value={form.min_order_amount}
            onChange={(event) => patchForm({ min_order_amount: event.target.value })}
          />
          <FormField
            label="Max discount (optional)"
            type="number"
            min="0"
            step="0.01"
            error={fieldErrors.max_discount_amount}
            value={form.max_discount_amount}
            onChange={(event) => patchForm({ max_discount_amount: event.target.value })}
          />
          <FormField
            label="Valid from"
            required
            type="datetime-local"
            error={fieldErrors.valid_from}
            value={form.valid_from}
            onChange={(event) => patchForm({ valid_from: event.target.value })}
          />
          <FormField
            label="Valid until (optional)"
            type="datetime-local"
            error={fieldErrors.valid_until}
            value={form.valid_until}
            onChange={(event) => patchForm({ valid_until: event.target.value })}
          />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => patchForm({ is_active: event.target.checked })}
            />
            Active immediately
          </label>
        </form>
      </Modal>

      {isLoading && !results.length ? <Skeleton className="h-48 w-full" /> : null}
      {error ? <ErrorMessage error={error} onRetry={reload} /> : null}
      {!isLoading && !error && results.length === 0 ? (
        <EmptyState title="No coupons yet" message="Create one to offer a checkout discount." />
      ) : null}

      {results.length > 0 ? (
        <>
          <ul className="manage-panel divide-y divide-line">
            {results.map((coupon) => (
              <li key={coupon.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold tracking-wide">
                    <FaIcon icon="coupons" className="h-3.5 w-3.5 text-accent" />
                    {coupon.code}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {coupon.discount_type === 'percentage'
                      ? `${coupon.value}% off`
                      : `${formatPrice(coupon.value)} off`}
                    {coupon.description ? ` · ${coupon.description}` : ''}
                    {' · '}
                    used {coupon.times_used}
                    {coupon.usage_limit != null ? `/${coupon.usage_limit}` : ''}
                    {' · '}
                    from {formatDate(coupon.valid_from)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleActive(coupon)}
                  className={`min-h-10 rounded-control px-3 text-xs font-semibold ${
                    coupon.is_active ? 'border border-line hover:bg-subtle' : 'bg-ink text-white'
                  }`}
                >
                  {coupon.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} totalCount={data?.count || 0} onPageChange={setPage} />
        </>
      ) : null}
    </section>
  )
}
