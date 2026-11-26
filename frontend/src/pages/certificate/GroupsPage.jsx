import { useEffect, useState } from 'react'

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

export default function GroupsPage() {
  const { showToast } = useToast()
  const list = useCertList((params) => certificateService.listGroups(params))
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [form, setForm] = useState({ name: '', course: '', description: '' })
  const [open, setOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(null)
  const [memberIds, setMemberIds] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [currentMemberIds, setCurrentMemberIds] = useState(() => new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    certificateService.listCourses({ page_size: 100 }).then((d) => setCourses(d.results || []))
    certificateService.listStudents({ page_size: 100, active: '1' }).then((d) => setStudents(d.results || []))
  }, [])

  const save = async (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.course) {
      showToast('Group name and course are required.', 'error')
      return
    }
    setSaving(true)
    try {
      await certificateService.createGroup(form)
      showToast('Group created.', 'success')
      setOpen(false)
      setForm({ name: '', course: '', description: '' })
      list.reload()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not create group.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openMembers = async (groupId) => {
    setMembersOpen(groupId)
    setMemberIds([])
    setMemberSearch('')
    try {
      const data = await certificateService.listMembers(groupId)
      const rows = Array.isArray(data) ? data : data.results || []
      setCurrentMemberIds(new Set(rows.map((m) => String(m.student))))
    } catch {
      setCurrentMemberIds(new Set())
    }
  }

  const addMembers = async () => {
    if (!membersOpen || !memberIds.length) return
    try {
      await certificateService.addMembers(membersOpen, memberIds.map(Number))
      showToast('Students added to group.', 'success')
      setMembersOpen(null)
      setMemberIds([])
      list.reload()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not add members.', 'error')
    }
  }

  const removeMembers = async () => {
    if (!membersOpen || !memberIds.length) return
    try {
      await certificateService.removeMembers(membersOpen, memberIds.map(Number))
      showToast('Students removed from group.', 'success')
      setMembersOpen(null)
      setMemberIds([])
      list.reload()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not remove members.', 'error')
    }
  }

  return (
    <div>
      <SearchAndFilter
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search groups"
        actions={
          <button type="button" className="cert-btn-primary cert-btn-sm" onClick={() => setOpen(true)}>
            <FaIcon icon="plus" className="h-3.5 w-3.5" />
            Create group
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
              { key: 'name', header: 'Group', render: (r) => <span className="font-semibold">{r.name}</span> },
              { key: 'course_title', header: 'Course' },
              { key: 'student_count', header: 'Students' },
              { key: 'completed_count', header: 'Completed' },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <button
                    type="button"
                    className="cert-btn-outline cert-icon-btn"
                    title="Manage members"
                    aria-label={`Manage members for ${r.name}`}
                    onClick={() => openMembers(r.id)}
                  >
                    <FaIcon icon="users" className="h-3.5 w-3.5" />
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
        title="Create group / batch"
        footer={
          <>
            <button type="button" className="cert-btn-outline" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="cert-group-form" className="cert-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create'}
            </button>
          </>
        }
      >
        <form id="cert-group-form" onSubmit={save} className="grid gap-3">
          <label className="block text-sm font-medium">
            Name *
            <input
              className="cert-input mt-1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Course *
            <select
              className="cert-input mt-1"
              value={form.course}
              onChange={(e) => setForm((f) => ({ ...f, course: e.target.value }))}
              required
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Description
            <textarea
              className="cert-input mt-1 min-h-20"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(membersOpen)}
        onClose={() => setMembersOpen(null)}
        title="Manage group members"
        description="Select students to add or remove."
        size="wide"
        footer={
          <>
            <button
              type="button"
              className="cert-btn-outline cert-icon-btn"
              title="Close"
              aria-label="Close"
              onClick={() => setMembersOpen(null)}
            >
              <FaIcon icon="xmark" className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="cert-btn-outline cert-icon-btn cert-icon-btn--danger"
              title="Remove selected"
              aria-label="Remove selected"
              onClick={removeMembers}
              disabled={!memberIds.length}
            >
              <FaIcon icon="trash" className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="cert-btn-primary cert-btn-sm" onClick={addMembers} disabled={!memberIds.length}>
              <FaIcon icon="plus" className="h-3.5 w-3.5" />
              Add selected
            </button>
          </>
        }
      >
        <div className="relative mb-3">
          <FaIcon
            icon="search"
            className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cert-muted)]"
          />
          <input
            type="search"
            className="cert-input cert-input--search pl-9"
            placeholder="Filter students by name or enrollment #"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            aria-label="Filter students"
          />
        </div>
        <ul className="max-h-72 divide-y divide-[var(--cert-line)] overflow-y-auto rounded-[0.625rem] border border-[var(--cert-line)]">
          {students
            .filter((s) => {
              const q = memberSearch.trim().toLowerCase()
              if (!q) return true
              return (
                s.full_name.toLowerCase().includes(q) ||
                String(s.enrollment_number || '').toLowerCase().includes(q)
              )
            })
            .map((s) => (
              <li key={s.id} className="px-3 py-2">
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--cert-navy)]"
                      checked={memberIds.includes(String(s.id))}
                      onChange={(e) =>
                        setMemberIds((ids) =>
                          e.target.checked ? [...ids, String(s.id)] : ids.filter((id) => id !== String(s.id)),
                        )
                      }
                    />
                    <span>
                      <span className="font-medium">{s.full_name}</span>{' '}
                      <span className="text-xs text-[var(--cert-muted)]">({s.enrollment_number})</span>
                    </span>
                  </span>
                  {currentMemberIds.has(String(s.id)) ? (
                    <span className="cert-badge cert-badge--issued">In group</span>
                  ) : null}
                </label>
              </li>
            ))}
        </ul>
      </Modal>
    </div>
  )
}
