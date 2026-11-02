import { useEffect, useState } from 'react'

import Button from '../common/Button'
import ConfirmDialog from '../common/ConfirmDialog'
import ErrorMessage from '../common/ErrorMessage'
import Modal from '../common/Modal'
import Skeleton from '../common/Skeleton'
import FormField from '../forms/FormField'
import FaIcon from './FaIcon'
import ProductOptionsEditor from './ProductOptionsEditor'
import ProductPhotos from './ProductPhotos'
import {
  editFormFromProduct,
  emptyCreateForm,
  validateCreateProduct,
} from './productEditorUtils'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'

const PANELS = [
  { id: 'basics', label: 'Basics', hint: 'Name & listing' },
  { id: 'details', label: 'Details', hint: 'Copy & care' },
  { id: 'photos', label: 'Photos', hint: 'Shop images' },
  { id: 'options', label: 'Options', hint: 'Price & stock' },
]

function StatusChip({ on, label }) {
  return (
    <span
      className={`inline-flex items-center rounded-control px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase ${
        on ? 'bg-success-soft text-success' : 'bg-subtle text-muted'
      }`}
    >
      {label}
    </span>
  )
}

/**
 * Wide product create/edit popup. Tabbed panels stay inside the modal —
 * no page navigation, no horizontal snap track (that shifted the dialog).
 */
export default function ProductEditorModal({
  isOpen,
  onClose,
  mode,
  productId = null,
  catalogOptions = { brands: [], categories: [] },
  onSaved,
}) {
  const { showToast } = useToast()
  const [activePanel, setActivePanel] = useState('basics')
  const [workingMode, setWorkingMode] = useState(mode)
  const [workingId, setWorkingId] = useState(productId)
  const [product, setProduct] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [editForm, setEditForm] = useState(null)
  const [pendingPhotos, setPendingPhotos] = useState([])
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [photoDrag, setPhotoDrag] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [createErrors, setCreateErrors] = useState({})

  const brands = catalogOptions.brands || []
  const categories = catalogOptions.categories || []
  const panelLocked = workingMode === 'create'
  const activeIndex = PANELS.findIndex((panel) => panel.id === activePanel)

  useEffect(() => {
    if (!isOpen) return undefined
    setActivePanel('basics')
    setWorkingMode(mode)
    setWorkingId(productId)
    setLoadError(null)
    setConfirmDelete(false)

    if (mode === 'create') {
      setProduct(null)
      setEditForm(null)
      setCreateForm(emptyCreateForm())
      setCreateErrors({})
      setPendingPhotos((current) => {
        current.forEach((photo) => URL.revokeObjectURL(photo.preview))
        return []
      })
      setPhotoInputKey((key) => key + 1)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    portalService
      .getProduct(productId)
      .then((data) => {
        if (cancelled) return
        setProduct(data)
        setEditForm(editFormFromProduct(data))
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
  }, [isOpen, mode, productId])

  const goToPanel = (panelId) => {
    if (panelLocked && panelId !== 'basics') return
    setActivePanel(panelId)
  }

  const applyProductUpdate = (updated) => {
    setProduct(updated)
    setEditForm(editFormFromProduct(updated))
    onSaved?.(updated)
  }

  const createProduct = async (event) => {
    event.preventDefault()
    const nextErrors = validateCreateProduct(createForm)
    setCreateErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      showToast('Fix the highlighted fields, then create again.', 'error')
      return
    }
    setSaving(true)
    try {
      const created = await portalService.createProduct({
        name: createForm.name.trim(),
        brand_id: Number(createForm.brand_id),
        category_id: Number(createForm.category_id),
        short_description: createForm.short_description,
        variant_name: createForm.variant_name || 'Default',
        price: createForm.price,
        compare_at_price: createForm.compare_at_price || null,
        stock_quantity: Number(createForm.stock_quantity || 0),
      })
      let photoWarning = ''
      if (pendingPhotos.length) {
        try {
          await portalService.addProductImages(
            created.id,
            pendingPhotos.map((photo) => photo.file),
          )
        } catch (err) {
          photoWarning =
            err.response?.data?.detail ||
            'Product created, but photos failed. Add them in Photos.'
        }
      }
      const full = await portalService.getProduct(created.id)
      pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview))
      setPendingPhotos([])
      setWorkingMode('edit')
      setWorkingId(full.id)
      setProduct(full)
      setEditForm(editFormFromProduct(full))
      showToast(photoWarning || `${full.name} added.`, photoWarning ? 'error' : 'success')
      onSaved?.(full)
      goToPanel(photoWarning ? 'photos' : 'details')
    } catch (err) {
      const errors = err.response?.data?.errors
      const first = errors && Object.values(errors)[0]
      showToast(
        err.response?.data?.detail || (Array.isArray(first) ? first[0] : first) || 'Could not add product.',
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  const saveProductDetails = async (event) => {
    event?.preventDefault?.()
    if (!workingId || !editForm) return
    setSaving(true)
    try {
      const updated = await portalService.updateProduct(workingId, editForm)
      applyProductUpdate(updated)
      showToast(activePanel === 'details' ? 'Details saved.' : 'Basics saved.', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not save product.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const removeProduct = async () => {
    setDeleting(true)
    try {
      await portalService.deleteProduct(workingId)
      showToast('Product deleted.', 'success')
      onSaved?.(null)
      onClose()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not delete product.', 'error')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const coverUrl = product?.images?.[0]?.url || ''
  const title =
    workingMode === 'create' ? 'Add product' : product?.name || (loading ? 'Loading…' : 'Edit product')
  const description =
    workingMode === 'edit' && product
      ? [product.brand_name, product.category_name, product.slug ? `/${product.slug}` : '']
          .filter(Boolean)
          .join(' · ')
      : panelLocked
        ? 'Create the listing first — Details, Photos, and Options unlock after.'
        : undefined

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Previous section"
          title="Previous"
          disabled={activeIndex <= 0}
          onClick={() => goToPanel(PANELS[activeIndex - 1]?.id)}
        >
          <FaIcon icon="chevronLeft" className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Next section"
          title="Next"
          disabled={panelLocked || activeIndex >= PANELS.length - 1}
          onClick={() => goToPanel(PANELS[activeIndex + 1]?.id)}
        >
          <FaIcon icon="chevronRight" className="h-3.5 w-3.5" />
        </Button>
        {workingMode === 'edit' && activePanel === 'basics' ? (
          <Button type="button" size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {panelLocked && activePanel === 'basics' ? (
          <Button type="submit" form="manage-create-product-form" size="sm" isLoading={saving}>
            Create product
          </Button>
        ) : null}
        {workingMode === 'edit' && (activePanel === 'basics' || activePanel === 'details') ? (
          <Button
            type="submit"
            form={activePanel === 'basics' ? 'manage-edit-basics-form' : 'manage-edit-details-form'}
            size="sm"
            isLoading={saving}
          >
            Save {activePanel === 'basics' ? 'basics' : 'details'}
          </Button>
        ) : null}
        {workingMode === 'edit' && activePanel !== 'basics' && activePanel !== 'details' ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={activeIndex >= PANELS.length - 1}
            onClick={() => goToPanel(PANELS[activeIndex + 1]?.id)}
          >
            Continue
          </Button>
        ) : null}
      </div>
    </div>
  )

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        description={description}
        size="xl"
        footer={!loading && !loadError ? footer : null}
        contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0 text-sm text-ink"
      >
        <div className="shrink-0 border-b border-line bg-cream/40 px-4 py-3 sm:px-5">
          <nav aria-label="Product editor sections">
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PANELS.map((panel, index) => {
                const disabled = panelLocked && panel.id !== 'basics'
                const active = activePanel === panel.id
                return (
                  <li key={panel.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      title={disabled ? 'Create the product on Basics first' : panel.hint}
                      onClick={() => goToPanel(panel.id)}
                      className={`flex w-full min-h-11 items-center gap-2 rounded-control border px-2.5 py-2 text-left transition-colors ${
                        active
                          ? 'border-ink bg-ink text-white shadow-[0_1px_2px_rgb(17_17_17/0.12)]'
                          : disabled
                            ? 'cursor-not-allowed border-line/70 bg-surface text-muted opacity-55'
                            : 'border-line bg-surface text-ink hover:bg-subtle'
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold ${
                          active ? 'bg-white/20 text-white' : 'bg-subtle text-ink-soft'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.7rem] font-semibold tracking-[0.06em] uppercase">
                          {panel.label}
                        </span>
                        <span className={`block truncate text-[0.65rem] ${active ? 'text-white/75' : 'text-muted'}`}>
                          {panel.hint}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>
        </div>

        {loading ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : null}
        {loadError ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <ErrorMessage error={loadError} onRetry={() => window.location.reload()} />
          </div>
        ) : null}

        {!loading && !loadError ? (
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <section
              aria-label="Basics"
              hidden={activePanel !== 'basics'}
              className="absolute inset-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
            >
              {workingMode === 'create' ? (
                <form
                  id="manage-create-product-form"
                  onSubmit={createProduct}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <FormField
                    className="sm:col-span-2"
                    label="Name"
                    name="name"
                    required
                    autoComplete="off"
                    error={createErrors.name}
                    value={createForm.name}
                    placeholder="e.g. Spot Fade Serum"
                    onChange={(event) => {
                      setCreateForm({ ...createForm, name: event.target.value })
                      if (createErrors.name) setCreateErrors((current) => ({ ...current, name: undefined }))
                    }}
                  />
                  <FormField
                    label="Brand"
                    name="brand_id"
                    as="select"
                    required
                    error={createErrors.brand_id}
                    value={createForm.brand_id}
                    onChange={(event) => {
                      setCreateForm({ ...createForm, brand_id: event.target.value })
                      if (createErrors.brand_id) {
                        setCreateErrors((current) => ({ ...current, brand_id: undefined }))
                      }
                    }}
                  >
                    <option value="">Choose brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </FormField>
                  <FormField
                    label="Category"
                    name="category_id"
                    as="select"
                    required
                    error={createErrors.category_id}
                    value={createForm.category_id}
                    onChange={(event) => {
                      setCreateForm({ ...createForm, category_id: event.target.value })
                      if (createErrors.category_id) {
                        setCreateErrors((current) => ({ ...current, category_id: undefined }))
                      }
                    }}
                  >
                    <option value="">Choose category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </FormField>
                  <FormField
                    label="First option name"
                    name="variant_name"
                    value={createForm.variant_name}
                    placeholder="Shade or size"
                    hint="You can add more options after creating."
                    onChange={(event) => setCreateForm({ ...createForm, variant_name: event.target.value })}
                  />
                  <FormField
                    label="Selling price (₹)"
                    name="price"
                    required
                    inputMode="decimal"
                    error={createErrors.price}
                    value={createForm.price}
                    onChange={(event) => {
                      setCreateForm({ ...createForm, price: event.target.value })
                      if (createErrors.price) setCreateErrors((current) => ({ ...current, price: undefined }))
                    }}
                  />
                  <FormField
                    label="Original price"
                    name="compare_at_price"
                    inputMode="decimal"
                    error={createErrors.compare_at_price}
                    value={createForm.compare_at_price}
                    placeholder="Blank if not on sale"
                    onChange={(event) => {
                      setCreateForm({ ...createForm, compare_at_price: event.target.value })
                      if (createErrors.compare_at_price) {
                        setCreateErrors((current) => ({ ...current, compare_at_price: undefined }))
                      }
                    }}
                  />
                  <FormField
                    label="Starting stock"
                    name="stock_quantity"
                    type="number"
                    min="0"
                    error={createErrors.stock_quantity}
                    value={createForm.stock_quantity}
                    onChange={(event) => {
                      setCreateForm({ ...createForm, stock_quantity: event.target.value })
                      if (createErrors.stock_quantity) {
                        setCreateErrors((current) => ({ ...current, stock_quantity: undefined }))
                      }
                    }}
                  />
                  <FormField
                    className="sm:col-span-2"
                    label="Short description"
                    name="short_description"
                    value={createForm.short_description}
                    onChange={(event) =>
                      setCreateForm({ ...createForm, short_description: event.target.value })
                    }
                  />
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
                      Photos (optional)
                    </p>
                    <p className="mt-1 text-xs text-muted">First photo becomes the shop card.</p>
                    <div
                      onDragEnter={(event) => {
                        event.preventDefault()
                        setPhotoDrag(true)
                      }}
                      onDragOver={(event) => {
                        event.preventDefault()
                        setPhotoDrag(true)
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) setPhotoDrag(false)
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        setPhotoDrag(false)
                        const files = [...event.dataTransfer.files].filter((file) =>
                          file.type.startsWith('image/'),
                        )
                        pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview))
                        setPendingPhotos(
                          files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
                        )
                      }}
                      className={`mt-2 rounded-card border border-dashed p-4 ${
                        photoDrag ? 'border-accent bg-accent-soft' : 'border-line bg-subtle'
                      }`}
                    >
                      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-btn bg-ink px-4 text-sm font-semibold text-white">
                        Choose files
                        <input
                          key={photoInputKey}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="sr-only"
                          onChange={(event) => {
                            pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview))
                            setPendingPhotos(
                              [...event.target.files].map((file) => ({
                                file,
                                preview: URL.createObjectURL(file),
                              })),
                            )
                          }}
                        />
                      </label>
                      {pendingPhotos.length > 0 ? (
                        <ul className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto">
                          {pendingPhotos.map((photo) => (
                            <li key={photo.preview} className="shrink-0">
                              <img
                                src={photo.preview}
                                alt=""
                                className="h-16 w-16 rounded-control object-cover"
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-muted">Or drop images here.</p>
                      )}
                    </div>
                  </div>
                </form>
              ) : editForm ? (
                <form
                  id="manage-edit-basics-form"
                  onSubmit={saveProductDetails}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-subtle/60 p-3">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt=""
                        className="h-14 w-14 rounded-control object-cover bg-surface"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-control bg-cream text-xs font-semibold text-muted">
                        No photo
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-semibold text-ink">
                        {product?.name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <StatusChip on={editForm.is_active} label={editForm.is_active ? 'Active' : 'Hidden'} />
                        <StatusChip
                          on={editForm.is_featured}
                          label={editForm.is_featured ? 'Featured' : 'Not featured'}
                        />
                      </div>
                    </div>
                  </div>
                  <FormField
                    label="Name"
                    name="edit-name"
                    required
                    value={editForm.name}
                    onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                  />
                  <FormField
                    label="Short description"
                    name="edit-short"
                    value={editForm.short_description}
                    onChange={(event) =>
                      setEditForm({ ...editForm, short_description: event.target.value })
                    }
                  />
                  <div className="flex flex-wrap gap-4">
                    <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={editForm.is_active}
                        onChange={(event) =>
                          setEditForm({ ...editForm, is_active: event.target.checked })
                        }
                      />
                      Active on shop
                    </label>
                    <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={editForm.is_featured}
                        onChange={(event) =>
                          setEditForm({ ...editForm, is_featured: event.target.checked })
                        }
                      />
                      Featured
                    </label>
                  </div>
                </form>
              ) : null}
            </section>

            <section
              aria-label="Details"
              hidden={activePanel !== 'details'}
              className="absolute inset-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
            >
              {panelLocked || !editForm ? (
                <p className="text-sm text-muted">Create the product on Basics first.</p>
              ) : (
                <form
                  id="manage-edit-details-form"
                  onSubmit={saveProductDetails}
                  className="space-y-3"
                >
                  <FormField
                    label="Description"
                    name="description"
                    as="textarea"
                    rows={4}
                    value={editForm.description}
                    onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      label="Ingredients"
                      name="ingredients"
                      as="textarea"
                      rows={3}
                      value={editForm.ingredients}
                      onChange={(event) =>
                        setEditForm({ ...editForm, ingredients: event.target.value })
                      }
                    />
                    <FormField
                      label="How to use"
                      name="how_to_use"
                      as="textarea"
                      rows={3}
                      value={editForm.how_to_use}
                      onChange={(event) => setEditForm({ ...editForm, how_to_use: event.target.value })}
                    />
                  </div>
                  <FormField
                    className="max-w-xs"
                    label="Net quantity"
                    name="net_quantity"
                    value={editForm.net_quantity}
                    onChange={(event) => setEditForm({ ...editForm, net_quantity: event.target.value })}
                  />
                </form>
              )}
            </section>

            <section
              aria-label="Photos"
              hidden={activePanel !== 'photos'}
              className="absolute inset-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
            >
              {panelLocked || !product ? (
                <p className="text-sm text-muted">Create the product on Basics first.</p>
              ) : (
                <ProductPhotos product={product} onChange={applyProductUpdate} embedded />
              )}
            </section>

            <section
              aria-label="Options"
              hidden={activePanel !== 'options'}
              className="absolute inset-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
            >
              {panelLocked || !product ? (
                <p className="text-sm text-muted">Create the product on Basics first.</p>
              ) : (
                <ProductOptionsEditor product={product} onChange={applyProductUpdate} />
              )}
            </section>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete this product?"
        message="This removes the product, its options, and reviews. Past orders keep their line items."
        confirmLabel="Delete"
        isConfirming={deleting}
        onConfirm={removeProduct}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
