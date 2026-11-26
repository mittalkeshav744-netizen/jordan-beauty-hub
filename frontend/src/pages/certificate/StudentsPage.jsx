import { useState } from 'react'

import ConfirmationModal from '../../components/certificate/ConfirmationModal'
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
  full_name: '',
  email: '',
  phone: '',
  enrollment_number: '',
  notes: '',
  is_active: true,
}

export default function StudentsPage() {
  const { showToast } = useToast()
  const list = useCertList((params) => certificateService.listStudents(params))
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [importMapping, setImportMapping] = useState({})
  const [syncBusy, setSyncBusy] = useState(false)

  const syncFromShop = async () => {
    setSyncBusy(true)
    try {
      const result = await certificateService.syncStudentsFromShop()
      showToast(
        result.detail ||
          `Synced ${result.linked_enrollments || 0} shop enrollment(s). New students: ${result.students_created || 0}.`,
        'success',
      )
      list.reload()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not sync shop enrollments.', 'error')
    } finally {
      setSyncBusy(false)
    }
  }

  const save = async (event) => {
    event.preventDefault()
    if (!form.full_name.trim() || !form.email.trim() || !form.enrollment_number.trim()) {
      showToast('Name, email and enrollment number are required.', 'error')
      return
    }
    setSaving(true)
    try {
      if (editingId) await certificateService.updateStudent(editingId, form)
      else await certificateService.createStudent(form)
      showToast(editingId ? 'Student updated.' : 'Student added.', 'success')
      setOpen(false)
      list.reload()
    } catch (err) {
      const data = err?.response?.data
      const msg =
        data?.enrollment_number?.[0] ||
        data?.email?.[0] ||
        data?.detail ||
        'Could not save student.'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const onImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImportBusy(true)
    try {
      const preview = await certificateService.importStudentsPreview(file)
      setImportFile(file)
      setImportPreview(preview)
      setImportMapping(preview.suggested_mapping || {})
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not read file.', 'error')
    } finally {
      setImportBusy(false)
    }
  }

  const confirmImport = async () => {
    if (!importFile) return
    setImportBusy(true)
    try {
      const result = await certificateService.importStudents(importFile, importMapping)
      showToast(
        `Imported ${result.created}. Skipped ${result.skipped?.length || 0}. Errors ${result.errors?.length || 0}.`,
        result.errors?.length ? 'info' : 'success',
      )
      setImportFile(null)
      setImportPreview(null)
      list.reload()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Import failed.', 'error')
    } finally {
      setImportBusy(false)
    }
  }

  const onExport = async () => {
    try {
      const blob = await certificateService.exportStudents({ search: list.search || undefined })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'students.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showToast('Export failed.', 'error')
    }
  }

  return (
    <div>
      <SearchAndFilter
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search name, email, enrollment no."
        actions={
          <>
            <button
              type="button"
              className="cert-btn-outline cert-btn-sm"
              onClick={syncFromShop}
              disabled={syncBusy}
              title="Import customers who enrolled in shop courses"
            >
              <FaIcon icon="rotate" className="h-3.5 w-3.5" />
              {syncBusy ? 'Syncing…' : 'Sync shop'}
            </button>
            <label className="cert-btn-outline cert-btn-sm cursor-pointer">
              <FaIcon icon="upload" className="h-3.5 w-3.5" />
              {importBusy ? 'Reading…' : 'Import'}
              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={onImportFile}
                disabled={importBusy}
              />
            </label>
            <button type="button" className="cert-btn-outline cert-btn-sm" onClick={onExport}>
              <FaIcon icon="download" className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              className="cert-btn-primary cert-btn-sm"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
                setOpen(true)
              }}
            >
              <FaIcon icon="plus" className="h-3.5 w-3.5" />
              Add student
            </button>
          </>
        }
      />

      {list.loading ? <LoadingState /> : null}
      {list.error ? <EmptyState icon="info" title="Error" message={list.error} /> : null}
      {!list.loading && !list.error ? (
        <>
          <DataTable
            rows={list.data.results}
            columns={[
              { key: 'enrollment_number', header: 'Enrollment #' },
              { key: 'full_name', header: 'Name', render: (r) => <span className="font-semibold">{r.full_name}</span> },
              { key: 'email', header: 'Email' },
              { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
              {
                key: 'is_active',
                header: 'Status',
                render: (r) =>
                  r.is_active ? (
                    <span className="cert-badge cert-badge--issued">Active</span>
                  ) : (
                    <span className="cert-badge cert-badge--draft">Inactive</span>
                  ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      className="cert-btn-outline cert-icon-btn"
                      title="Edit"
                      aria-label={`Edit ${r.full_name}`}
                      onClick={() => {
                        setEditingId(r.id)
                        setForm({
                          full_name: r.full_name,
                          email: r.email,
                          phone: r.phone || '',
                          enrollment_number: r.enrollment_number,
                          notes: r.notes || '',
                          is_active: r.is_active,
                        })
                        setOpen(true)
                      }}
                    >
                      <FaIcon icon="pen" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="cert-btn-outline cert-icon-btn cert-icon-btn--danger"
                      title="Delete"
                      aria-label={`Delete ${r.full_name}`}
                      onClick={() => setDeleteId(r.id)}
                    >
                      <FaIcon icon="trash" className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
        title={editingId ? 'Edit student' : 'Add student'}
        footer={
          <>
            <button type="button" className="cert-btn-outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="cert-student-form" className="cert-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <form id="cert-student-form" onSubmit={save} className="grid gap-3">
          {[
            ['full_name', 'Full name *'],
            ['enrollment_number', 'Enrollment number *'],
            ['email', 'Email *'],
            ['phone', 'Phone'],
          ].map(([key, label]) => (
            <label key={key} className="block text-sm font-medium">
              {label}
              <input
                className="cert-input mt-1"
                type={key === 'email' ? 'email' : 'text'}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required={key !== 'phone'}
              />
            </label>
          ))}
          <label className="block text-sm font-medium">
            Notes
            <textarea
              className="cert-input mt-1 min-h-20"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
        </form>
      </Modal>

      <ConfirmationModal
        open={Boolean(deleteId)}
        title="Delete student?"
        message="This removes the academy student record. Issued certificates are protected and may block deletion."
        danger
        confirmLabel="Delete"
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          try {
            await certificateService.deleteStudent(deleteId)
            showToast('Student deleted.', 'success')
            setDeleteId(null)
            list.reload()
          } catch (err) {
            showToast(err?.response?.data?.detail || 'Could not delete student.', 'error')
          }
        }}
      />

      <Modal
        isOpen={Boolean(importPreview)}
        onClose={() => {
          setImportPreview(null)
          setImportFile(null)
        }}
        title="Map import columns"
        description={
          importPreview
            ? `${importPreview.row_count} data rows found. Duplicates are never overwritten.`
            : undefined
        }
        size="wide"
        footer={
          <>
            <button
              type="button"
              className="cert-btn-outline"
              onClick={() => {
                setImportPreview(null)
                setImportFile(null)
              }}
              disabled={importBusy}
            >
              Cancel
            </button>
            <button type="button" className="cert-btn-primary" onClick={confirmImport} disabled={importBusy}>
              {importBusy ? 'Importing…' : 'Import'}
            </button>
          </>
        }
      >
        {importPreview ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {(importPreview.fields || []).map((field) => (
                <label key={field} className="block text-sm font-medium">
                  {field}
                  {['enrollment_number', 'full_name', 'email'].includes(field) ? ' *' : ''}
                  <select
                    className="cert-input mt-1"
                    value={importMapping[field] || ''}
                    onChange={(e) => setImportMapping((m) => ({ ...m, [field]: e.target.value }))}
                    required={['enrollment_number', 'full_name', 'email'].includes(field)}
                  >
                    <option value="">— skip —</option>
                    {(importPreview.headers || []).map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-4 overflow-x-auto rounded-[var(--cert-radius)] border border-[var(--cert-line)]">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="bg-[var(--cert-gold-soft)]/50">
                    {(importPreview.headers || []).map((header) => (
                      <th key={header} className="px-2 py-2 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(importPreview.preview_rows || []).map((row, idx) => (
                    <tr key={idx} className="border-t border-[var(--cert-line)]">
                      {(importPreview.headers || []).map((header) => (
                        <td key={header} className="px-2 py-1.5">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  )
}
