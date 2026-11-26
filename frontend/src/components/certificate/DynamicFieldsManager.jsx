import { useEffect, useState } from 'react'

import ConfirmationModal from './ConfirmationModal'
import EmptyState from './EmptyState'
import LoadingState from './LoadingState'
import Modal from '../common/Modal'
import FaIcon from '../manage/FaIcon'
import { useToast } from '../../hooks/useToast'
import { certificateService } from '../../services/certificateService'

const EMPTY_FORM = {
  label: '',
  key: '',
  source: 'custom',
  default_value: '',
  sort_order: 100,
  is_active: true,
}

function toFieldKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export default function DynamicFieldsManager({ onFieldsChange, embedded = false }) {
  const { showToast } = useToast()
  const [fields, setFields] = useState([])
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [keyEdited, setKeyEdited] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [restoring, setRestoring] = useState(false)

  const syncFields = (next) => {
    const list = Array.isArray(next) ? next : next?.results || []
    setFields(list)
    onFieldsChange?.(list)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [fieldList, sourceList] = await Promise.all([
        certificateService.listFields(),
        certificateService.fieldSources().catch(() => []),
      ])
      syncFields(fieldList)
      setSources(Array.isArray(sourceList) ? sourceList : [])
    } catch {
      showToast('Could not load certificate fields.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const sourceLabel = (source) =>
    sources.find((s) => s.value === source)?.label || (source === 'custom' ? 'Custom text' : source)

  const openCreate = () => {
    setEditingId(null)
    setKeyEdited(false)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (field) => {
    setEditingId(field.id)
    setKeyEdited(true)
    setForm({
      label: field.label || '',
      key: field.key || '',
      source: field.source || 'custom',
      default_value: field.default_value || '',
      sort_order: field.sort_order ?? 100,
      is_active: Boolean(field.is_active),
    })
    setModalOpen(true)
  }

  const saveField = async (event) => {
    event.preventDefault()
    const cleanKey = toFieldKey(form.key)
    if (!form.label.trim() || !cleanKey) {
      showToast('Label and placeholder key are required.', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        label: form.label.trim(),
        key: cleanKey,
        sort_order: Number(form.sort_order) || 100,
      }
      if (editingId) {
        const updated = await certificateService.updateField(editingId, payload)
        syncFields(fields.map((f) => (f.id === editingId ? updated : f)))
        showToast('Field updated.', 'success')
      } else {
        const created = await certificateService.createField(payload)
        syncFields([...fields, created])
        showToast('Field added.', 'success')
      }
      setModalOpen(false)
    } catch (err) {
      const data = err?.response?.data
      const msg = data?.key?.[0] || data?.label?.[0] || data?.detail || 'Could not save field.'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (field) => {
    try {
      const updated = await certificateService.updateField(field.id, { is_active: !field.is_active })
      syncFields(fields.map((f) => (f.id === field.id ? updated : f)))
    } catch {
      showToast('Could not update field.', 'error')
    }
  }

  const restoreDefaults = async () => {
    setRestoring(true)
    try {
      const restored = await certificateService.restoreDefaultFields()
      syncFields(restored)
      showToast('Default fields restored.', 'success')
    } catch {
      showToast('Could not restore default fields.', 'error')
    } finally {
      setRestoring(false)
    }
  }

  const body = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-cert-display)] text-xl font-semibold text-[var(--cert-navy)]">
            <FaIcon icon="code" className="h-4 w-4 text-[var(--cert-gold)]" />
            Certificate dynamic fields
          </h2>
          <p className="mt-0.5 text-xs text-[var(--cert-muted)]">
            Add, edit, hide, or delete placeholders shown in the template editor&apos;s Insert field menu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="cert-btn-outline cert-btn-sm"
            onClick={restoreDefaults}
            disabled={restoring}
            title="Restore built-in fields"
          >
            <FaIcon icon="rotate" className="h-3.5 w-3.5" />
            {restoring ? 'Restoring…' : 'Restore defaults'}
          </button>
          <button type="button" className="cert-btn-primary cert-btn-sm" onClick={openCreate}>
            <FaIcon icon="plus" className="h-3.5 w-3.5" />
            Add field
          </button>
        </div>
      </div>

      {loading ? <LoadingState /> : null}
      {!loading && fields.length === 0 ? (
        <EmptyState
          icon="code"
          title="No fields configured"
          message="Add a custom field or restore the built-in certificate fields."
        />
      ) : null}
      {!loading && fields.length > 0 ? (
        <div className="overflow-x-auto rounded-[0.75rem] border border-[var(--cert-line)]">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--cert-line)] bg-[var(--cert-gold-soft)]/40 text-xs tracking-wide text-[var(--cert-muted)] uppercase">
                <th className="px-3.5 py-2.5 font-semibold">Field</th>
                <th className="px-3.5 py-2.5 font-semibold">Placeholder</th>
                <th className="px-3.5 py-2.5 font-semibold">Source</th>
                <th className="px-3.5 py-2.5 font-semibold">Status</th>
                <th className="px-3.5 py-2.5 text-right font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cert-line)]">
              {fields.map((field) => (
                <tr key={field.id} className="hover:bg-[var(--cert-ivory)]/50">
                  <td className="px-3.5 py-2.5 font-medium text-[var(--cert-navy)]">{field.label}</td>
                  <td className="px-3.5 py-2.5">
                    <code className="rounded bg-[var(--cert-ivory)] px-1.5 py-0.5 text-xs text-[var(--cert-navy)]">
                      {`{{${field.key}}}`}
                    </code>
                  </td>
                  <td className="px-3.5 py-2.5 text-xs text-[var(--cert-muted)]">
                    <span>{sourceLabel(field.source)}</span>
                    {field.default_value ? (
                      <span className="mt-0.5 block truncate max-w-[14rem] text-[var(--cert-ink)]">
                        Default: {field.default_value}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleActive(field)}
                      title="Toggle visibility in Insert field menu"
                      className={`cert-badge ${field.is_active ? 'cert-badge--issued' : 'cert-badge--draft'}`}
                    >
                      {field.is_active ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        className="cert-btn-outline cert-icon-btn"
                        title="Edit field"
                        aria-label={`Edit ${field.label}`}
                        onClick={() => openEdit(field)}
                      >
                        <FaIcon icon="pen" className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="cert-btn-outline cert-icon-btn cert-icon-btn--danger"
                        title="Delete field"
                        aria-label={`Delete ${field.label}`}
                        onClick={() => setDeleteTarget(field)}
                      >
                        <FaIcon icon="trash" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit dynamic field' : 'Add dynamic field'}
        description="Available inside Insert field and email templates."
        footer={
          <>
            <button type="button" className="cert-btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="cert-dynamic-field-form" className="cert-btn-primary" disabled={saving}>
              <FaIcon icon="check" className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save field'}
            </button>
          </>
        }
      >
        <form id="cert-dynamic-field-form" onSubmit={saveField} className="space-y-4">
          <label className="block text-sm font-medium">
            Field label *
            <input
              className="cert-input mt-1"
              value={form.label}
              onChange={(e) => {
                const nextLabel = e.target.value
                setForm((prev) => ({
                  ...prev,
                  label: nextLabel,
                  key: !keyEdited ? toFieldKey(nextLabel) : prev.key,
                }))
              }}
              placeholder="e.g. Instructor name"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Placeholder key *
            <input
              className="cert-input mt-1 font-mono text-xs"
              value={form.key}
              onChange={(e) => {
                setKeyEdited(true)
                setForm((prev) => ({ ...prev, key: toFieldKey(e.target.value) }))
              }}
              placeholder="e.g. instructor_name"
              required
            />
            <span className="mt-1 block text-xs text-[var(--cert-muted)]">
              Renders as <code>{`{{${form.key || 'field_key'}}}`}</code>
            </span>
          </label>
          <label className="block text-sm font-medium">
            Value source
            <select
              className="cert-input mt-1"
              value={form.source}
              onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
            >
              {(sources.length
                ? sources
                : [{ value: 'custom', label: 'Custom text (default / per-batch value)' }]
              ).map((src) => (
                <option key={src.value} value={src.value}>
                  {src.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            {form.source === 'custom' ? 'Default value' : 'Fallback value (if blank)'}
            <input
              className="cert-input mt-1"
              value={form.default_value}
              onChange={(e) => setForm((prev) => ({ ...prev, default_value: e.target.value }))}
              placeholder={form.source === 'custom' ? 'e.g. Aanya Kapoor' : 'Optional fallback'}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--cert-navy)]"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
            />
            Show in Insert field menu
          </label>
        </form>
      </Modal>

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete field?"
        message={
          deleteTarget
            ? `Remove ${deleteTarget.label} ({{${deleteTarget.key}}}) from Insert field? You can restore built-in fields anytime.`
            : ''
        }
        danger
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await certificateService.deleteField(deleteTarget.id)
            syncFields(fields.filter((f) => f.id !== deleteTarget.id))
            setDeleteTarget(null)
            showToast('Field deleted.', 'success')
          } catch (err) {
            showToast(err?.response?.data?.detail || 'Could not delete field.', 'error')
          }
        }}
      />
    </div>
  )

  if (embedded) return body
  return <section className="cert-card space-y-4 p-5 sm:p-6">{body}</section>
}
