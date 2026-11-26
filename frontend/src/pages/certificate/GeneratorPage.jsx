import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import FaIcon from '../../components/manage/FaIcon'
import { useToast } from '../../hooks/useToast'
import { certificateService } from '../../services/certificateService'
import { downloadPdfBlob, printPdfBlob } from '../../utils/printPdfBlob'

export default function GeneratorPage() {
  const { showToast } = useToast()
  const [courses, setCourses] = useState([])
  const [groups, setGroups] = useState([])
  const [templates, setTemplates] = useState([])
  const [customFields, setCustomFields] = useState([])
  const [customData, setCustomData] = useState({})
  const [students, setStudents] = useState([])
  const [courseId, setCourseId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [selected, setSelected] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [completionDate, setCompletionDate] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [grade, setGrade] = useState('')
  const [forceReissue, setForceReissue] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [autoPrint, setAutoPrint] = useState(false)
  const [job, setJob] = useState(null)
  const [busy, setBusy] = useState(false)
  const [printBusy, setPrintBusy] = useState(false)
  const autoPrintedJobRef = useRef(null)

  useEffect(() => {
    Promise.all([
      certificateService.listCourses({ page_size: 100 }),
      certificateService.listTemplates({ page_size: 100 }),
      certificateService.listFields().catch(() => []),
    ]).then(([c, t, f]) => {
      setCourses(c.results || [])
      setTemplates(t.results || [])
      const def = (t.results || []).find((x) => x.is_default)
      if (def) setTemplateId(String(def.id))
      const fieldRows = Array.isArray(f) ? f : f?.results || []
      const custom = fieldRows.filter((item) => item.is_active && item.source === 'custom')
      setCustomFields(custom)
      setCustomData(Object.fromEntries(custom.map((item) => [item.key, item.default_value || ''])))
    })
  }, [])

  useEffect(() => {
    if (!courseId) {
      setGroups([])
      setStudents([])
      return undefined
    }
    let alive = true
    certificateService.listGroups({ course: courseId, page_size: 200 }).then((d) => {
      if (alive) setGroups(d.results || [])
    })
    const params = { page_size: 200, active: '1' }
    if (groupId) params.group = groupId
    certificateService.listStudents(params).then((d) => {
      if (!alive) return
      setStudents(
        (d.results || []).map((s) => ({
          id: s.id,
          name: s.full_name,
          status: 'active',
          group: groupId || null,
        })),
      )
    })
    return () => {
      alive = false
    }
  }, [courseId, groupId])

  useEffect(() => {
    if (!job?.id || job.status === 'completed' || job.status === 'failed') return undefined
    const timer = setInterval(async () => {
      try {
        const next = await certificateService.getJob(job.id)
        setJob(next)
      } catch {
        /* ignore transient */
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [job])

  const createdItems = (() => {
    const items = job?.result?.created_items
    if (Array.isArray(items) && items.length > 0) return items
    const pubIds = job?.result?.created
    if (Array.isArray(pubIds) && pubIds.length > 0) {
      return pubIds.map((publicId) => ({ id: null, public_id: publicId, student_name: '' }))
    }
    return []
  })()

  const fetchBatchBlob = async (items) => {
    const ids = items.map((item) => item.id).filter(Boolean)
    if (ids.length === 1) return certificateService.downloadPdf(ids[0])
    if (ids.length > 0) return certificateService.printBundle({ certificate_ids: ids })
    return certificateService.printBundle({ public_ids: items.map((item) => item.public_id) })
  }

  const printGenerated = async (items) => {
    if (!items.length) return
    setPrintBusy(true)
    try {
      const blob = await fetchBatchBlob(items)
      const label = items.length === 1 ? `Print ${items[0].public_id}` : `Print ${items.length} certificates`
      printPdfBlob(blob, label)
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not open print dialog.', 'error')
    } finally {
      setPrintBusy(false)
    }
  }

  const downloadGenerated = async (items) => {
    if (!items.length) return
    setPrintBusy(true)
    try {
      const blob = await fetchBatchBlob(items)
      const filename = items.length === 1 ? `${items[0].public_id}.pdf` : 'certificates-bundle.pdf'
      downloadPdfBlob(blob, filename)
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not download PDF.', 'error')
    } finally {
      setPrintBusy(false)
    }
  }

  useEffect(() => {
    if (!autoPrint || job?.status !== 'completed' || !createdItems.length) return
    if (autoPrintedJobRef.current === job.id) return
    autoPrintedJobRef.current = job.id
    printGenerated(createdItems)
  }, [autoPrint, job?.id, job?.status, createdItems.length])

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return true
    return String(s.name || '').toLowerCase().includes(q)
  })

  const generate = async () => {
    if (!courseId || !templateId || !selected.length) {
      showToast('Select course, template and at least one student.', 'error')
      return
    }
    setBusy(true)
    try {
      const created = await certificateService.generate({
        course_id: Number(courseId),
        template_id: Number(templateId),
        student_ids: selected.map(Number),
        group_id: groupId ? Number(groupId) : undefined,
        completion_date: completionDate || undefined,
        issue_date: issueDate || undefined,
        grade,
        custom_data: customFields.length ? customData : undefined,
        force_reissue: forceReissue,
        send_email: sendEmail,
      })
      autoPrintedJobRef.current = null
      setJob(created)
      showToast('Generation started.', 'success')
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not start generation.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="cert-card space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cert-line)] pb-3">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-cert-display)] text-xl font-semibold text-[var(--cert-navy)]">
            <FaIcon icon="generator" className="h-4 w-4 text-[var(--cert-gold)]" />
            Certificate generator
          </h2>
          <span className="text-xs text-[var(--cert-muted)]">Issue, email, and print certificates in batch</span>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wider text-[var(--cert-muted)] uppercase">
            1. Course, template &amp; details
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Course *
              <select
                className="cert-input mt-1"
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value)
                  setGroupId('')
                  setSelected([])
                }}
              >
                <option value="">Select course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Group / batch
              <select
                className="cert-input mt-1"
                value={groupId}
                onChange={(e) => {
                  setGroupId(e.target.value)
                  setSelected([])
                }}
              >
                <option value="">All active students</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Template *
              <select className="cert-input mt-1" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Select template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Grade
              <input className="cert-input mt-1" value={grade} onChange={(e) => setGrade(e.target.value)} />
            </label>
            <label className="text-sm font-medium">
              Completion date
              <input className="cert-input mt-1" type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
            </label>
            <label className="text-sm font-medium">
              Issue date
              <input className="cert-input mt-1" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </label>
          </div>
          {customFields.length > 0 ? (
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              {customFields.map((field) => (
                <label key={field.key} className="text-sm font-medium">
                  {field.label}
                  <input
                    className="cert-input mt-1"
                    value={customData[field.key] ?? ''}
                    onChange={(e) =>
                      setCustomData((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.default_value || `{{${field.key}}}`}
                  />
                </label>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2.5 border-t border-[var(--cert-line)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wider text-[var(--cert-muted)] uppercase">
              2. Select students ({selected.length} selected)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="cert-btn-outline cert-btn-sm"
                onClick={() => setSelected(filteredStudents.map((s) => String(s.id)))}
                disabled={filteredStudents.length === 0}
              >
                Select all shown
              </button>
              {selected.length > 0 ? (
                <button
                  type="button"
                  className="cert-btn-outline cert-btn-sm"
                  onClick={() => setSelected([])}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          {students.length > 0 ? (
            <input
              type="search"
              className="cert-input"
              placeholder="Filter students by name…"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              aria-label="Filter students"
            />
          ) : null}
          <ul className="max-h-64 divide-y divide-[var(--cert-line)] overflow-y-auto rounded-[var(--cert-radius)] border border-[var(--cert-line)]">
            {filteredStudents.length === 0 ? (
              <li className="p-4 text-sm text-[var(--cert-muted)]">
                {courseId
                  ? 'No matching students found.'
                  : 'Select a course above to load students.'}
              </li>
            ) : (
              filteredStudents.map((s) => (
                <li key={s.id} className="px-3 py-2">
                  <label className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--cert-navy)]"
                        checked={selected.includes(String(s.id))}
                        onChange={(e) =>
                          setSelected((ids) =>
                            e.target.checked ? [...ids, String(s.id)] : ids.filter((id) => id !== String(s.id)),
                          )
                        }
                      />
                      <span className="font-medium">{s.name}</span>
                    </span>
                    <span className="cert-badge cert-badge--issued">{s.status}</span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-2 border-t border-[var(--cert-line)] pt-4">
          <p className="text-xs font-semibold tracking-wider text-[var(--cert-muted)] uppercase">
            3. Delivery &amp; print options
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[var(--cert-navy)]" checked={forceReissue} onChange={(e) => setForceReissue(e.target.checked)} />
            Allow reissue if an issued certificate already exists
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[var(--cert-navy)]" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Email PDF to each student after issue
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[var(--cert-navy)]" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} />
            Open print dialog automatically when generation finishes
          </label>
        </div>

        <button type="button" className="cert-btn-primary" disabled={busy} onClick={generate}>
          <FaIcon icon="generator" className="h-3.5 w-3.5" />
          {busy ? 'Starting…' : `Generate (${selected.length})`}
        </button>
      </div>

      {job ? (
        <div className="cert-card p-5">
          <h3 className="font-semibold text-[var(--cert-navy)]">Job progress</h3>
          <p className="mt-2 text-sm">
            Status: <strong>{job.status}</strong> · {job.current} / {job.total}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--cert-line)]">
            <div
              className="h-full bg-[var(--cert-gold)] transition-all"
              style={{ width: `${job.total ? Math.round((job.current / job.total) * 100) : 0}%` }}
            />
          </div>
          {job.result?.created?.length ? (
            <p className="mt-3 text-sm text-[var(--cert-success)]">Created: {job.result.created.join(', ')}</p>
          ) : null}
          {job.result?.emailed?.length ? (
            <p className="mt-1 text-sm text-[var(--cert-success)]">Emailed: {job.result.emailed.join(', ')}</p>
          ) : null}
          {job.error_message ? (
            <p className="mt-2 text-sm text-[var(--cert-danger)]">{job.error_message}</p>
          ) : null}
          {job.result?.errors?.length ? (
            <ul className="mt-2 text-sm text-[var(--cert-danger)]">
              {job.result.errors.map((err, i) => (
                <li key={i}>{err.error}</li>
              ))}
            </ul>
          ) : null}
          {job.status === 'completed' && createdItems.length > 0 ? (
            <div className="mt-4 space-y-3 border-t border-[var(--cert-line)] pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="cert-btn-primary"
                  disabled={printBusy}
                  onClick={() => printGenerated(createdItems)}
                >
                  <FaIcon icon="print" className="h-3.5 w-3.5" />
                  {printBusy ? 'Preparing…' : `Print ${createdItems.length > 1 ? `all (${createdItems.length})` : 'certificate'}`}
                </button>
                <button
                  type="button"
                  className="cert-btn-outline"
                  disabled={printBusy}
                  onClick={() => downloadGenerated(createdItems)}
                >
                  <FaIcon icon="download" className="h-3.5 w-3.5" />
                  {createdItems.length > 1 ? 'Download merged PDF' : 'Download PDF'}
                </button>
                <Link to="/certificate/issued" className="cert-btn-outline">
                  View issued certificates
                </Link>
              </div>
              <ul className="divide-y divide-[var(--cert-line)] rounded-[var(--cert-radius)] border border-[var(--cert-line)]">
                {createdItems.map((item) => (
                  <li key={item.public_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-semibold text-[var(--cert-navy)]">{item.public_id}</span>
                      {item.student_name ? (
                        <span className="text-[var(--cert-muted)]"> · {item.student_name}</span>
                      ) : null}
                    </span>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        className="cert-btn-outline cert-icon-btn"
                        title="Print"
                        aria-label={`Print ${item.public_id}`}
                        disabled={printBusy}
                        onClick={() => printGenerated([item])}
                      >
                        <FaIcon icon="print" className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="cert-btn-outline cert-icon-btn"
                        title="Download PDF"
                        aria-label={`Download ${item.public_id}`}
                        disabled={printBusy}
                        onClick={() => downloadGenerated([item])}
                      >
                        <FaIcon icon="download" className="h-3.5 w-3.5" />
                      </button>
                      {item.id ? (
                        <Link
                          to={`/certificate/issued/${item.id}`}
                          className="cert-btn-outline cert-icon-btn"
                          title="View certificate"
                          aria-label={`View ${item.public_id}`}
                        >
                          <FaIcon icon="eye" className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : job.status === 'completed' ? (
            <Link to="/certificate/issued" className="cert-btn-outline mt-4 inline-flex">
              View issued certificates
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
