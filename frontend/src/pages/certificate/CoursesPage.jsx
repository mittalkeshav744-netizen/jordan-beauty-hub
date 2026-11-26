import { useState } from 'react'

import DataTable from '../../components/certificate/DataTable'
import EmptyState from '../../components/certificate/EmptyState'
import LoadingState from '../../components/certificate/LoadingState'
import Pagination from '../../components/certificate/Pagination'
import SearchAndFilter from '../../components/certificate/SearchAndFilter'
import Modal from '../../components/common/Modal'
import FaIcon from '../../components/manage/FaIcon'
import { useCertList } from '../../hooks/useCertList'
import { useToast } from '../../hooks/useToast'
import { certificateService } from '../../services/certificateService'

const emptyForm = {
  title: '',
  code: '',
  category: '',
  duration_text: '',
  short_description: '',
  description: '',
  price: '0',
  is_published: true,
  is_active: true,
  start_date: '',
  end_date: '',
}

function Field({ id, label, required, hint, children }) {
  return (
    <div className="cert-field">
      <label htmlFor={id} className="cert-field__label">
        {label}
        {required ? <span className="text-[var(--cert-danger,#b42318)]"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="cert-field__hint">{hint}</p> : null}
    </div>
  )
}

export default function CoursesPage() {
  const { showToast } = useToast()
  const list = useCertList((params) => certificateService.listCourses(params))
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const setField = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [key]: value }))
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    setForm({
      title: row.title || '',
      code: row.code || '',
      category: row.category || '',
      duration_text: row.duration_text || '',
      short_description: row.short_description || '',
      description: row.description || '',
      price: String(row.price ?? '0'),
      is_published: Boolean(row.is_published),
      is_active: Boolean(row.is_active),
      start_date: row.start_date || '',
      end_date: row.end_date || '',
    })
    setOpen(true)
  }

  const save = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      showToast('Course name is required.', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: form.price || '0',
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      }
      if (editingId) await certificateService.updateCourse(editingId, payload)
      else await certificateService.createCourse(payload)
      showToast(editingId ? 'Course updated.' : 'Course created.', 'success')
      setOpen(false)
      list.reload()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not save course.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <SearchAndFilter
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search courses"
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: list.filters.status || '',
            onChange: (value) => list.setFilters((f) => ({ ...f, status: value || undefined })),
            options: [
              { value: '', label: 'All statuses' },
              { value: 'active', label: 'Published active' },
              { value: 'inactive', label: 'Inactive / draft' },
            ],
          },
        ]}
        actions={
          <button type="button" className="cert-btn-primary cert-btn-sm" onClick={openCreate}>
            <FaIcon icon="plus" className="h-3.5 w-3.5" />
            Add course
          </button>
        }
      />

      {list.loading ? <LoadingState /> : null}
      {list.error ? <EmptyState icon="info" title="Error" message={list.error} /> : null}
      {!list.loading && !list.error ? (
        <>
          <DataTable
            rows={list.data.results}
            columns={[
              { key: 'title', header: 'Course', render: (r) => <span className="font-semibold">{r.title}</span> },
              { key: 'code', header: 'Code', render: (r) => r.code || '—' },
              { key: 'category', header: 'Category', render: (r) => r.category || '—' },
              { key: 'duration_text', header: 'Duration', render: (r) => r.duration_text || '—' },
              {
                key: 'status',
                header: 'Status',
                render: (r) =>
                  r.is_published && r.is_active ? (
                    <span className="cert-badge cert-badge--issued">Published</span>
                  ) : (
                    <span className="cert-badge cert-badge--draft">Draft</span>
                  ),
              },
              {
                key: 'counts',
                header: 'Academy',
                render: (r) => `${r.enrollment_count || 0} enrolled · ${r.issued_count || 0} issued`,
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <button
                    type="button"
                    className="cert-btn-outline cert-icon-btn"
                    title="Edit"
                    aria-label={`Edit ${r.title}`}
                    onClick={() => openEdit(r)}
                  >
                    <FaIcon icon="pen" className="h-3.5 w-3.5" />
                  </button>
                ),
              },
            ]}
          />
          <Pagination
            page={list.page}
            pageSize={list.pageSize}
            totalCount={list.data.count}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        </>
      ) : null}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Edit course' : 'Add course'}
        description="Same course record used in the shop and Owner Portal."
        size="wide"
        footer={
          <>
            <button type="button" className="cert-btn-outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="cert-course-form" className="cert-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save course'}
            </button>
          </>
        }
      >
        <form id="cert-course-form" onSubmit={save} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="cert-course-title" label="Course name" required>
              <input
                id="cert-course-title"
                className="cert-input"
                type="text"
                value={form.title}
                onChange={setField('title')}
                required
                placeholder="e.g. Bridal Makeup Foundations"
                autoComplete="off"
              />
            </Field>
            <Field id="cert-course-code" label="Course code" hint="Optional short code for certificates">
              <input
                id="cert-course-code"
                className="cert-input"
                type="text"
                value={form.code}
                onChange={setField('code')}
                placeholder="e.g. BRD-101"
                autoComplete="off"
              />
            </Field>
            <Field id="cert-course-category" label="Category">
              <input
                id="cert-course-category"
                className="cert-input"
                type="text"
                value={form.category}
                onChange={setField('category')}
                placeholder="e.g. Makeup"
              />
            </Field>
            <Field id="cert-course-duration" label="Duration">
              <input
                id="cert-course-duration"
                className="cert-input"
                type="text"
                value={form.duration_text}
                onChange={setField('duration_text')}
                placeholder="e.g. 6 weeks"
              />
            </Field>
            <Field id="cert-course-price" label="Price (INR)">
              <input
                id="cert-course-price"
                className="cert-input"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={setField('price')}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="cert-course-start" label="Start date">
                <input
                  id="cert-course-start"
                  className="cert-input"
                  type="date"
                  value={form.start_date}
                  onChange={setField('start_date')}
                />
              </Field>
              <Field id="cert-course-end" label="End date">
                <input
                  id="cert-course-end"
                  className="cert-input"
                  type="date"
                  value={form.end_date}
                  onChange={setField('end_date')}
                />
              </Field>
            </div>
          </div>

          <Field id="cert-course-short" label="Short description">
            <input
              id="cert-course-short"
              className="cert-input"
              type="text"
              value={form.short_description}
              onChange={setField('short_description')}
              placeholder="One line for the shop listing"
            />
          </Field>

          <Field id="cert-course-description" label="Full description">
            <textarea
              id="cert-course-description"
              className="cert-input"
              value={form.description}
              onChange={setField('description')}
              placeholder="What students learn in this course"
              rows={4}
            />
          </Field>

          <div className="flex flex-wrap gap-5 rounded-[0.75rem] border border-[var(--cert-line,#e5e0d8)] bg-[var(--cert-canvas,#faf7f2)] px-4 py-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[var(--cert-ink,#1a1a1a)]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--cert-navy,#1e2a44)]"
                checked={form.is_published}
                onChange={setField('is_published')}
              />
              Published on shop
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[var(--cert-ink,#1a1a1a)]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--cert-navy,#1e2a44)]"
                checked={form.is_active}
                onChange={setField('is_active')}
              />
              Active for certificates
            </label>
          </div>
        </form>
      </Modal>
    </div>
  )
}
