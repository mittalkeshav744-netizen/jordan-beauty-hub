import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import Button from '../common/Button'
import ConfirmDialog from '../common/ConfirmDialog'
import ErrorMessage from '../common/ErrorMessage'
import Modal from '../common/Modal'
import Skeleton from '../common/Skeleton'
import FaIcon from './FaIcon'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'
import { formatPrice } from '../../utils/format'

/**
 * Slim product popup for everyday edits. Full curriculum (details / photos / options)
 * stays in the wide popup or the product page — both entry points live here.
 */
export default function ProductQuickEditModal({
  isOpen,
  productId,
  onClose,
  onSaved,
  onOpenFullPopup,
}) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [product, setProduct] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isOpen || productId == null) return undefined
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setConfirmDelete(false)
    portalService
      .getProduct(productId)
      .then((data) => {
        if (cancelled) return
        setProduct(data)
        setForm({
          name: data.name || '',
          short_description: data.short_description || '',
          is_active: Boolean(data.is_active),
          is_featured: Boolean(data.is_featured),
        })
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, productId])

  const save = async (event) => {
    event.preventDefault()
    if (!productId || !form) return
    setSaving(true)
    try {
      const updated = await portalService.updateProduct(productId, {
        name: form.name.trim(),
        short_description: form.short_description,
        is_active: form.is_active,
        is_featured: form.is_featured,
      })
      setProduct(updated)
      setForm({
        name: updated.name || '',
        short_description: updated.short_description || '',
        is_active: Boolean(updated.is_active),
        is_featured: Boolean(updated.is_featured),
      })
      onSaved?.(updated)
      showToast('Product updated.', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not save product.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const removeProduct = async () => {
    setDeleting(true)
    try {
      await portalService.deleteProduct(productId)
      showToast('Product deleted.', 'success')
      onSaved?.(null)
      onClose()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not delete product.', 'error')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const openPage = () => {
    onClose()
    navigate(`/manage/products/${productId}`)
  }

  const openPopup = () => {
    onClose()
    onOpenFullPopup?.(productId)
  }

  const primaryVariant = product?.variants?.[0]
  const title = product?.name || (loading ? 'Loading…' : 'Quick edit')

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="default"
        footer={
          !loading && !loadError && form ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button type="submit" form="product-quick-edit-form" size="sm" isLoading={saving}>
                Save
              </Button>
            </>
          ) : null
        }
      >
        {loading ? <Skeleton className="h-40 w-full" /> : null}
        {loadError ? <ErrorMessage error={loadError} /> : null}

        {!loading && !loadError && form ? (
          <form id="product-quick-edit-form" onSubmit={save} className="space-y-3">
            <p className="text-xs text-muted">
              {product?.brand_name} · {product?.category_name}
              {primaryVariant ? ` · from ${formatPrice(primaryVariant.price)}` : ''}
            </p>

            <label className="block text-sm">
              <span className="font-medium text-ink">Name</span>
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="mt-1 min-h-11 w-full rounded-control border border-line px-3"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-ink">Short description</span>
              <input
                value={form.short_description}
                onChange={(event) => setForm({ ...form, short_description: event.target.value })}
                className="mt-1 min-h-11 w-full rounded-control border border-line px-3"
              />
            </label>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                />
                Active on shop
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(event) => setForm({ ...form, is_featured: event.target.checked })}
                />
                Featured
              </label>
            </div>

            <div className="rounded-control border border-line bg-cream/50 p-3">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Full editor</p>
              <p className="mt-1 text-sm text-ink-soft">
                Details, photos, options, price and stock — same editor, popup or page.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={openPopup}>
                  <FaIcon icon="pen" className="mr-1.5 h-3 w-3" />
                  Open popup
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={openPage}>
                  Open as page
                </Button>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={() => setConfirmDelete(true)}
            >
              Delete product
            </Button>
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete this product?"
        message="This removes the product, its options, and reviews. Past orders keep their line items."
        confirmLabel="Delete"
        isConfirming={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={removeProduct}
      />
    </>
  )
}
