import { useEffect, useState } from 'react'

import Button from '../common/Button'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'
import { discountPercent, formatPrice } from '../../utils/format'
import { variantDraftsFromProduct } from './productEditorUtils'

/**
 * Shade/size options with price and stock. Used on the full product page.
 * Stock feedback uses toasts (no nested popup).
 */
export default function ProductOptionsEditor({ product, onChange }) {
  const { showToast } = useToast()
  const [variantDrafts, setVariantDrafts] = useState(() => variantDraftsFromProduct(product))
  const [stockDrafts, setStockDrafts] = useState({})
  const [newVariant, setNewVariant] = useState({
    name: '',
    price: '',
    compare_at_price: '',
    stock_quantity: '0',
  })
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    setVariantDrafts(variantDraftsFromProduct(product))
  }, [product])

  const syncFromProduct = (updated) => {
    setVariantDrafts(variantDraftsFromProduct(updated))
    onChange?.(updated)
  }

  const saveVariant = async (variant) => {
    const variantId = variant.id
    const draft = variantDrafts[variantId]
    setBusyId(`save-${variantId}`)
    try {
      let updated = await portalService.updateVariant(variantId, {
        name: draft.name,
        price: draft.price,
        compare_at_price: draft.compare_at_price || null,
        is_active: draft.is_active,
      })
      const raw = stockDrafts[variantId]
      const text = raw === undefined ? String(variant.stock_quantity) : String(raw).trim()
      if (/^\d+$/.test(text)) {
        const desired = Number(text)
        const current = updated.variants?.find((row) => row.id === variantId)?.stock_quantity
        if (current != null && desired !== current) {
          const stock = await portalService.adjustStock(variantId, {
            quantity_change: desired - current,
            reason: desired > current ? 'restock' : 'adjustment',
            reference: 'Owner portal',
          })
          updated = {
            ...updated,
            variants: updated.variants.map((item) =>
              item.id === variantId ? { ...item, stock_quantity: stock.stock_quantity } : item,
            ),
          }
          setStockDrafts((drafts) => ({ ...drafts, [variantId]: String(stock.stock_quantity) }))
        }
      }
      syncFromProduct(updated)
      showToast('Option saved.', 'success')
    } catch (err) {
      const errors = err.response?.data?.errors
      const first = errors && Object.values(errors)[0]
      showToast(
        err.response?.data?.detail || (Array.isArray(first) ? first[0] : first) || 'Could not save option.',
        'error',
      )
    } finally {
      setBusyId(null)
    }
  }

  const applyStock = async (variant) => {
    const raw = stockDrafts[variant.id]
    const text = raw === undefined ? String(variant.stock_quantity) : String(raw).trim()
    if (!/^\d+$/.test(text)) {
      const corrected = text.startsWith('-') ? '0' : String(variant.stock_quantity)
      setStockDrafts((drafts) => ({ ...drafts, [variant.id]: corrected }))
      showToast(
        text.startsWith('-') ? 'Stock cannot be below zero.' : 'Enter a whole number for stock.',
        'error',
      )
      return
    }
    const desired = Number(text)
    if (desired === variant.stock_quantity) {
      showToast(`${variant.name} already has ${desired} in stock.`, 'success')
      return
    }
    setBusyId(`stock-${variant.id}`)
    try {
      const updated = await portalService.adjustStock(variant.id, {
        quantity_change: desired - variant.stock_quantity,
        reason: desired > variant.stock_quantity ? 'restock' : 'adjustment',
        reference: 'Owner portal',
      })
      const next = {
        ...product,
        variants: product.variants.map((item) =>
          item.id === variant.id ? { ...item, stock_quantity: updated.stock_quantity } : item,
        ),
      }
      setStockDrafts((drafts) => ({ ...drafts, [variant.id]: String(updated.stock_quantity) }))
      onChange?.(next)
      showToast(`${variant.name} now has ${updated.stock_quantity} in stock.`, 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not update stock.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const markOut = async (variantId) => {
    setBusyId(`oos-${variantId}`)
    try {
      const updated = await portalService.markOutOfStock(variantId)
      const next = {
        ...product,
        variants: product.variants.map((variant) =>
          variant.id === variantId ? { ...variant, stock_quantity: updated.stock_quantity } : variant,
        ),
      }
      setStockDrafts((drafts) => ({ ...drafts, [variantId]: '0' }))
      onChange?.(next)
      showToast('Marked out of stock.', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not update stock.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const addVariant = async (event) => {
    event.preventDefault()
    setBusyId('add')
    try {
      const updated = await portalService.addVariant(product.id, {
        name: newVariant.name.trim(),
        price: newVariant.price,
        compare_at_price: newVariant.compare_at_price || null,
        stock_quantity: Number(newVariant.stock_quantity || 0),
      })
      setNewVariant({ name: '', price: '', compare_at_price: '', stock_quantity: '0' })
      syncFromProduct(updated)
      showToast('Option added.', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not add option.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const removeVariant = async (variantId) => {
    setBusyId(`rm-${variantId}`)
    try {
      const updated = await portalService.deleteVariant(variantId)
      syncFromProduct(updated)
      showToast('Option removed.', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not remove option.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      {(product.variants || []).map((variant) => {
        const draft = variantDrafts[variant.id] || {
          name: variant.name,
          price: variant.price,
          compare_at_price: variant.compare_at_price || '',
          is_active: variant.is_active,
        }
        const off = discountPercent(draft.price, draft.compare_at_price)
        return (
          <div key={variant.id} className="rounded-card border border-line bg-canvas p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{variant.sku}</p>
                <p className="text-xs text-muted">
                  Now {formatPrice(variant.price)}
                  {variant.compare_at_price ? ` · was ${formatPrice(variant.compare_at_price)}` : ''}
                  {' · '}
                  {variant.stock_quantity} in stock
                </p>
              </div>
              {off ? (
                <span className="rounded-control bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
                  {off}% off
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-ink">Option name</span>
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setVariantDrafts((current) => ({
                      ...current,
                      [variant.id]: { ...draft, name: event.target.value },
                    }))
                  }
                  className="mt-1 min-h-11 w-full rounded-control border border-line px-3"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink">Selling price</span>
                <input
                  value={draft.price}
                  onChange={(event) =>
                    setVariantDrafts((current) => ({
                      ...current,
                      [variant.id]: { ...draft, price: event.target.value },
                    }))
                  }
                  className="mt-1 min-h-11 w-full rounded-control border border-line px-3"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink">Original price (discount)</span>
                <input
                  value={draft.compare_at_price}
                  onChange={(event) =>
                    setVariantDrafts((current) => ({
                      ...current,
                      [variant.id]: { ...draft, compare_at_price: event.target.value },
                    }))
                  }
                  placeholder="Blank = no discount"
                  className="mt-1 min-h-11 w-full rounded-control border border-line px-3"
                />
              </label>
              <label className="flex min-h-11 items-end gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(event) =>
                    setVariantDrafts((current) => ({
                      ...current,
                      [variant.id]: { ...draft, is_active: event.target.checked },
                    }))
                  }
                />
                Option is live
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink">Stock</span>
                <input
                  aria-label={`Stock for ${variant.sku}`}
                  type="number"
                  min="0"
                  step="1"
                  value={stockDrafts[variant.id] ?? String(variant.stock_quantity)}
                  onChange={(event) =>
                    setStockDrafts((drafts) => ({
                      ...drafts,
                      [variant.id]: event.target.value,
                    }))
                  }
                  className="mt-1 min-h-11 w-full rounded-control border border-line bg-canvas px-3"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                isLoading={busyId === `save-${variant.id}`}
                onClick={() => saveVariant(variant)}
              >
                Save option
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={busyId === `stock-${variant.id}`}
                onClick={() => applyStock(variant)}
              >
                Stock only
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={busyId === `oos-${variant.id}`}
                onClick={() => markOut(variant.id)}
                disabled={variant.stock_quantity <= 0}
              >
                Out of stock
              </Button>
              {product.variants.length > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  isLoading={busyId === `rm-${variant.id}`}
                  onClick={() => removeVariant(variant.id)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        )
      })}

      <form
        onSubmit={addVariant}
        className="grid gap-3 rounded-card border border-dashed border-line bg-cream/40 p-4 sm:grid-cols-2"
      >
        <h3 className="text-sm font-semibold text-ink sm:col-span-2">Add another option</h3>
        <label className="block text-sm">
          <span className="font-medium text-ink">Name</span>
          <input
            required
            value={newVariant.name}
            onChange={(event) => setNewVariant({ ...newVariant, name: event.target.value })}
            placeholder="Shade or size"
            className="mt-1 min-h-11 w-full rounded-control border border-line px-3"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">Selling price</span>
          <input
            required
            value={newVariant.price}
            onChange={(event) => setNewVariant({ ...newVariant, price: event.target.value })}
            className="mt-1 min-h-11 w-full rounded-control border border-line px-3"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">Original price</span>
          <input
            value={newVariant.compare_at_price}
            onChange={(event) => setNewVariant({ ...newVariant, compare_at_price: event.target.value })}
            className="mt-1 min-h-11 w-full rounded-control border border-line px-3"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">Stock</span>
          <input
            type="number"
            min="0"
            value={newVariant.stock_quantity}
            onChange={(event) => setNewVariant({ ...newVariant, stock_quantity: event.target.value })}
            className="mt-1 min-h-11 w-full rounded-control border border-line px-3"
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" isLoading={busyId === 'add'}>
            Add option
          </Button>
        </div>
      </form>
    </div>
  )
}
