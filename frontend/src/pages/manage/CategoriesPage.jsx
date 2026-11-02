import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import Button from '../../components/common/Button'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import Skeleton from '../../components/common/Skeleton'
import FaIcon from '../../components/manage/FaIcon'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import ManageToolbar from '../../components/manage/ManageToolbar'
import FormField from '../../components/forms/FormField'
import { useApi } from '../../hooks/useApi'
import { useManageFocus } from '../../hooks/useManageFocus'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'
import { getErrorMessage } from '../../utils/errors'

const CATEGORY_DRAG = 'application/x-jordan-category'

function emptyCategoryForm() {
  return {
    name: '',
    slug: '',
    description: '',
    sort_order: '0',
    is_active: true,
    image: null,
  }
}

export default function CategoriesPage() {
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState('all') // 'all', 'active', 'inactive'
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyCategoryForm)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { showToast } = useToast()

  const { data, isLoading, error, reload, setData } = useApi(
    () => portalService.listCategories(),
    [],
  )
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const [reordering, setReordering] = useState(false)

  const categories = useMemo(() => {
    const rows = data?.results || (Array.isArray(data) ? data : [])
    return [...rows].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
    )
  }, [data])

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      if (filterActive === 'active' && !cat.is_active) return false
      if (filterActive === 'inactive' && cat.is_active) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          cat.name.toLowerCase().includes(q) ||
          cat.slug.toLowerCase().includes(q) ||
          (cat.description && cat.description.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [categories, filterActive, search])

  const stats = useMemo(() => {
    const total = categories.length
    const active = categories.filter((c) => c.is_active).length
    const products = categories.reduce((sum, c) => sum + (c.product_count || 0), 0)
    return { total, active, inactive: total - active, products }
  }, [categories])

  const openCreateForm = () => {
    setEditingId(null)
    setForm(emptyCategoryForm())
    setImagePreview('')
    setShowForm(true)
  }

  const openEditForm = (category) => {
    setEditingId(category.id)
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      sort_order: String(category.sort_order ?? 0),
      is_active: category.is_active,
      image: null,
    })
    setImagePreview(category.image_url || category.image || '')
    setShowForm(true)
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      setForm((prev) => ({ ...prev, image: file }))
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      showToast('Please enter a category name.', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim(),
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      }
      if (form.image) {
        payload.image = form.image
      }

      if (editingId) {
        await portalService.updateCategory(editingId, payload)
        showToast(`Category "${form.name}" updated.`, 'success')
      } else {
        await portalService.createCategory(payload)
        showToast(`Category "${form.name}" created and live.`, 'success')
      }

      setShowForm(false)
      setEditingId(null)
      setForm(emptyCategoryForm())
      setImagePreview('')
      reload()
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not save category.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (category) => {
    try {
      await portalService.updateCategory(category.id, { is_active: !category.is_active })
      showToast(
        `Category "${category.name}" marked as ${!category.is_active ? 'active' : 'inactive'}.`,
        'success',
      )
      reload()
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update category status.'), 'error')
    }
  }

  const handleDelete = async () => {
    if (!deletingCategory) return
    setIsDeleting(true)
    try {
      await portalService.deleteCategory(deletingCategory.id)
      showToast(`Category "${deletingCategory.name}" deleted.`, 'success')
      setDeletingCategory(null)
      reload()
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete category.'), 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const persistOrder = async (ordered) => {
    const previous = data
    setData(Array.isArray(data) ? ordered : { ...data, results: ordered })
    setReordering(true)
    try {
      const saved = await portalService.reorderCategories(ordered.map((row) => row.id))
      setData(Array.isArray(saved) ? saved : ordered)
      showToast('Shop category order updated.', 'success')
    } catch (err) {
      setData(previous)
      showToast(getErrorMessage(err, 'Could not reorder categories.'), 'error')
    } finally {
      setReordering(false)
      setDragId(null)
      setOverId(null)
    }
  }

  const moveCategory = (fromId, toId) => {
    if (fromId === toId || reordering) return
    const fromIndex = categories.findIndex((row) => row.id === fromId)
    const toIndex = categories.findIndex((row) => row.id === toId)
    if (fromIndex < 0 || toIndex < 0) return
    const next = [...categories]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    persistOrder(next.map((row, index) => ({ ...row, sort_order: index })))
  }

  useManageFocus({ ready: !isLoading })

  return (
    <div className="space-y-6" data-manage-section="categories">
      <ManagePageHeader
        title="Categories"
        description="Create and organize store departments. Categories appear immediately on the storefront navigation, homepage, and shop filters."
        actions={
          <Button onClick={openCreateForm}>
            <FaIcon icon="plus" className="mr-2 h-3.5 w-3.5" />
            New category
          </Button>
        }
      />

      <div className="manage-panel grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, tone: 'text-ink' },
          { label: 'Active', value: stats.active, tone: 'text-success' },
          { label: 'Inactive', value: stats.inactive, tone: 'text-muted' },
          { label: 'Products', value: stats.products, tone: 'text-accent' },
        ].map((item) => (
          <div key={item.label} className="bg-surface px-4 py-3">
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted uppercase">{item.label}</p>
            <p className={`mt-1 font-display text-xl font-semibold ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <ManageToolbar
        search={
          <div className="relative w-full min-w-0 flex-1">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories…"
              aria-label="Search categories"
              className="min-h-11 w-full rounded-control border border-line bg-canvas py-2 pr-3 pl-3 text-sm text-ink placeholder:text-muted"
            />
          </div>
        }
        filters={
          <label className="relative inline-flex w-full min-w-0 items-center sm:w-auto sm:min-w-[10.5rem]">
            <span className="sr-only">Filter categories</span>
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-muted">
              <FaIcon icon="filter" className="h-3.5 w-3.5" />
            </span>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              aria-label="Filter categories"
              className="min-h-11 w-full appearance-none rounded-btn border border-line bg-canvas py-2 pr-8 pl-9 text-sm font-semibold text-ink transition-colors hover:bg-subtle focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
            >
              <option value="all">All ({categories.length})</option>
              <option value="active">Active ({stats.active})</option>
              <option value="inactive">Inactive ({stats.inactive})</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted">
              <FaIcon icon="chevronRight" className="h-3 w-3 rotate-90" />
            </span>
          </label>
        }
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Edit category' : 'Create new category'}
        size="wide"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="category-form" isLoading={saving}>
              {editingId ? 'Save changes' : 'Create category'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
          <FormField
            className="sm:col-span-2"
            label="Category name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Fragrances, Serums, Body Care"
          />
          <FormField
            label="URL slug (optional)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="auto-generated if empty"
          />
          <FormField
            label="Display sort order"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            placeholder="0"
            hint="Lower numbers appear first in navigation"
          />
          <FormField
            className="sm:col-span-2"
            label="Short description"
            as="textarea"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Appears on category banners and search cards..."
          />
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Category photo / banner</p>
            <div className="mt-1.5 flex items-center gap-4">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Category preview"
                  className="h-16 w-16 rounded-card border border-line object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-card border border-dashed border-line bg-subtle text-xs text-muted">
                  No photo
                </div>
              )}
              <div className="min-w-0 flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-xs text-ink file:mr-2 file:rounded-control file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-ink-soft"
                />
                <p className="mt-1 text-xs text-muted">Square or banner JPEG/PNG recommended</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              id="cat-is-active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded text-accent focus:ring-accent"
            />
            <label htmlFor="cat-is-active" className="cursor-pointer text-sm font-medium text-ink">
              Show this category live on the storefront
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingCategory)}
        title="Delete category?"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? If any products are assigned to this category, they must be reassigned first.`}
        confirmLabel="Delete category"
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingCategory(null)}
      />

      {isLoading && (
        <ul className="manage-panel divide-y divide-line overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-12 w-12 shrink-0 rounded-control" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <ErrorMessage message={error.message || 'Failed to load categories.'} />}

      {!isLoading && !error && categories.length === 0 && (
        <EmptyState
          title="No categories found"
          message="You have not created any categories yet. Create your first category to organize your products."
          action={
            <Button size="sm" onClick={openCreateForm}>
              Create category
            </Button>
          }
        />
      )}

      {!isLoading && !error && categories.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Drag rows to set shop order. Top of the list appears first on the homepage and navigation.
          </p>

          {filteredCategories.length === 0 ? (
            <EmptyState
              title="No categories match"
              message={`Nothing matches “${search || filterActive}”. Clear filters to see all rows.`}
            />
          ) : (
            <ul className="manage-panel divide-y divide-line overflow-hidden" aria-label="Categories">
              {filteredCategories.map((category) => {
                const index = categories.findIndex((row) => row.id === category.id)
                const productLabel = `${category.product_count ?? 0} product${
                  (category.product_count ?? 0) === 1 ? '' : 's'
                } →`
                return (
                  <li
                    key={category.id}
                    draggable={!reordering}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(CATEGORY_DRAG, String(category.id))
                      event.dataTransfer.setData('text/plain', String(category.id))
                      event.dataTransfer.effectAllowed = 'move'
                      setDragId(category.id)
                    }}
                    onDragEnd={() => {
                      setDragId(null)
                      setOverId(null)
                    }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                      if (overId !== category.id) setOverId(category.id)
                    }}
                    onDragLeave={() => {
                      if (overId === category.id) setOverId(null)
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      const fromId = Number(
                        event.dataTransfer.getData(CATEGORY_DRAG) ||
                          event.dataTransfer.getData('text/plain'),
                      )
                      moveCategory(fromId, category.id)
                    }}
                    className={`flex cursor-grab flex-col gap-3 px-3 py-3 transition-colors active:cursor-grabbing sm:flex-row sm:items-center sm:gap-4 sm:px-4 ${
                      overId === category.id && dragId !== category.id ? 'bg-accent-soft' : 'hover:bg-cream/50'
                    } ${dragId === category.id ? 'opacity-50' : ''} ${
                      reordering ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-muted">
                      <FaIcon icon="grip" className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-btn bg-subtle text-[0.65rem] font-bold text-muted">
                      {index >= 0 ? index + 1 : '—'}
                    </span>
                    {category.image_url || category.image ? (
                      <img
                        src={category.image_url || category.image}
                        alt=""
                        draggable={false}
                        className="h-11 w-11 shrink-0 rounded-control object-cover sm:h-12 sm:w-12"
                      />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-accent-soft text-xs font-bold text-accent sm:h-12 sm:w-12">
                        {category.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-display text-sm font-semibold tracking-tight text-ink sm:text-base">
                          {category.name}
                        </h3>
                        <span
                          className={`inline-flex items-center rounded-btn px-2 py-0.5 text-[0.65rem] font-bold uppercase ${
                            category.is_active
                              ? 'bg-success-soft text-success'
                              : 'bg-subtle text-muted'
                          }`}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        /shop?category={category.slug}
                        {category.description ? ` · ${category.description}` : ''}
                      </p>
                      <Link
                        to={`/manage/products?category=${category.id}`}
                        className="mt-1 inline-flex text-xs font-semibold text-accent hover:underline"
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                      >
                        {productLabel}
                      </Link>
                    </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-1.5 pl-8 sm:pl-0">
                      <a
                        href={`/shop?category=${category.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View on shop"
                        aria-label={`View ${category.name} on shop`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-btn border border-line text-ink-soft transition-colors hover:bg-subtle hover:text-ink"
                        onMouseDown={(event) => event.stopPropagation()}
                      >
                        <FaIcon icon="eye" className="h-3 w-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(category)}
                        title={category.is_active ? 'Deactivate' : 'Activate'}
                        aria-label={category.is_active ? `Deactivate ${category.name}` : `Activate ${category.name}`}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-btn border border-line transition-colors ${
                          category.is_active
                            ? 'text-success hover:bg-success-soft'
                            : 'text-muted hover:bg-subtle hover:text-ink'
                        }`}
                      >
                        <FaIcon icon="check" className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditForm(category)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-btn border border-line text-ink hover:bg-subtle"
                        title={`Edit ${category.name}`}
                        aria-label={`Edit ${category.name}`}
                      >
                        <FaIcon icon="pen" className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCategory(category)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-btn border border-line text-danger hover:bg-danger-soft"
                        title={`Delete ${category.name}`}
                        aria-label={`Delete ${category.name}`}
                      >
                        <FaIcon icon="trash" className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
