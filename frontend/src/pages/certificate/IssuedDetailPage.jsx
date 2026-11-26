import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import CertificateStatusBadge from '../../components/certificate/CertificateStatusBadge'
import ConfirmationModal from '../../components/certificate/ConfirmationModal'
import LoadingState from '../../components/certificate/LoadingState'
import FaIcon from '../../components/manage/FaIcon'
import { useToast } from '../../hooks/useToast'
import { certificateService } from '../../services/certificateService'
import { downloadPdfBlob, printPdfBlob } from '../../utils/printPdfBlob'

export default function IssuedDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [cert, setCert] = useState(null)
  const [audit, setAudit] = useState([])
  const [loading, setLoading] = useState(true)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [c, a] = await Promise.all([
        certificateService.getIssued(id),
        certificateService.audit(id),
      ])
      setCert(c)
      setAudit(a)
    } catch {
      showToast('Could not load certificate.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const sendEmail = async (scheduled) => {
    setSendingEmail(true)
    try {
      const payload = scheduled
        ? { scheduled_for: new Date(scheduled).toISOString(), force: true }
        : {}
      const log = await certificateService.emailCertificate(cert.id, payload)
      showToast(log.status === 'pending' ? 'Email scheduled.' : 'Email sent.', 'success')
      if (scheduled) setScheduleAt('')
      load()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Email failed.', 'error')
    } finally {
      setSendingEmail(false)
    }
  }

  if (loading || !cert) return <LoadingState />

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        to="/certificate/issued"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--cert-muted)] hover:text-[var(--cert-navy)]"
      >
        <FaIcon icon="arrowLeft" className="h-3.5 w-3.5" />
        Issued certificates
      </Link>

      <div className="cert-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[var(--cert-gold)] uppercase">Certificate</p>
            <h2 className="font-[family-name:var(--font-cert-display)] text-2xl font-semibold text-[var(--cert-navy)]">
              {cert.public_id}
            </h2>
            <p className="mt-1 text-sm text-[var(--cert-muted)]">
              {cert.student_name} · {cert.course_title}
            </p>
          </div>
          <CertificateStatusBadge status={cert.status} />
        </div>

        <dl className="mt-5 grid gap-3 border-t border-[var(--cert-line)] pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--cert-muted)] uppercase">Issue date</dt>
            <dd className="mt-0.5 font-medium">{cert.issue_date || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--cert-muted)] uppercase">Completion</dt>
            <dd className="mt-0.5 font-medium">{cert.completion_date || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--cert-muted)] uppercase">Grade</dt>
            <dd className="mt-0.5 font-medium">{cert.grade || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--cert-muted)] uppercase">Template</dt>
            <dd className="mt-0.5 font-medium">{cert.template_name || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--cert-muted)] uppercase">Verify &amp; QR PDF URL</dt>
            <dd className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-medium break-all">
              <Link to={`/certificate/verify/${cert.public_id}`} className="text-[var(--cert-navy)] hover:underline">
                /certificate/verify/{cert.public_id}
              </Link>
              <a
                href={certificateService.publicDownloadUrl(cert.public_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--cert-muted)] hover:text-[var(--cert-navy)] hover:underline"
              >
                Direct QR PDF link
              </a>
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--cert-line)] pt-4">
          <button
            type="button"
            className="cert-btn-primary cert-icon-btn"
            title="Download PDF"
            aria-label="Download PDF"
            onClick={async () => {
              try {
                const blob = await certificateService.downloadPdf(cert.id)
                downloadPdfBlob(blob, `${cert.public_id}.pdf`)
              } catch {
                showToast('Download failed.', 'error')
              }
            }}
          >
            <FaIcon icon="download" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="cert-btn-outline cert-icon-btn"
            title="Print on A4"
            aria-label="Print"
            onClick={async () => {
              try {
                const blob = await certificateService.printPdf(cert.id)
                printPdfBlob(blob, `Print ${cert.public_id}`)
              } catch {
                showToast('Could not open print dialog.', 'error')
              }
            }}
          >
            <FaIcon icon="print" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="cert-btn-outline cert-icon-btn"
            title="Send email now"
            aria-label="Send email now"
            disabled={sendingEmail}
            onClick={() => sendEmail('')}
          >
            <FaIcon icon="mail" className="h-3.5 w-3.5" />
          </button>
          {cert.status === 'issued' || cert.status === 'revoked' ? (
            <button
              type="button"
              className="cert-btn-outline cert-icon-btn"
              title="Reissue"
              aria-label="Reissue"
              onClick={async () => {
                try {
                  const next = await certificateService.reissue(cert.id, {})
                  showToast(`Reissued as ${next.public_id}`, 'success')
                  navigate(`/certificate/issued/${next.id}`)
                } catch (err) {
                  showToast(err?.response?.data?.detail || 'Reissue failed.', 'error')
                }
              }}
            >
              <FaIcon icon="copy" className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {cert.status === 'issued' ? (
            <button
              type="button"
              className="cert-btn-outline cert-icon-btn cert-icon-btn--danger"
              title="Cancel / Revoke"
              aria-label="Cancel / Revoke"
              onClick={() => setRevokeOpen(true)}
            >
              <FaIcon icon="ban" className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            className="cert-btn-outline cert-icon-btn cert-icon-btn--danger"
            title="Delete certificate"
            aria-label="Delete certificate"
            onClick={() => setDeleteOpen(true)}
          >
            <FaIcon icon="trash" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <section className="cert-card p-5">
        <h3 className="flex items-center gap-2 font-semibold text-[var(--cert-navy)]">
          <FaIcon icon="mail" className="h-4 w-4 text-[var(--cert-gold)]" />
          Schedule email delivery
        </h3>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="cert-field min-w-[14rem] flex-1 sm:max-w-xs">
            <span className="cert-field__label">Send date &amp; time</span>
            <input
              type="datetime-local"
              className="cert-input"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="cert-btn-outline cert-btn-sm"
            disabled={!scheduleAt || sendingEmail}
            onClick={() => sendEmail(scheduleAt)}
          >
            <FaIcon icon="mail" className="h-3.5 w-3.5" />
            Schedule email
          </button>
        </div>
      </section>

      <section className="cert-card p-5">
        <h3 className="flex items-center gap-2 font-semibold text-[var(--cert-navy)]">
          <FaIcon icon="jobs" className="h-4 w-4 text-[var(--cert-gold)]" />
          Audit history
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          {audit.length === 0 ? <li className="text-[var(--cert-muted)]">No audit entries.</li> : null}
          {audit.map((entry) => (
            <li key={entry.id} className="border-b border-[var(--cert-line)] py-2 last:border-0">
              <p className="font-medium capitalize">{String(entry.action || '').replace(/_/g, ' ')}</p>
              <p className="text-[var(--cert-muted)]">{entry.detail}</p>
              <p className="text-xs text-[var(--cert-muted)]">{new Date(entry.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmationModal
        open={revokeOpen}
        title="Cancel / revoke certificate?"
        message="Public verification will show this certificate as revoked and QR download will stop."
        danger
        confirmLabel="Cancel certificate"
        onClose={() => setRevokeOpen(false)}
        onConfirm={async () => {
          try {
            await certificateService.revoke(cert.id, 'Cancelled by administrator')
            showToast('Certificate cancelled.', 'success')
            setRevokeOpen(false)
            load()
          } catch (err) {
            showToast(err?.response?.data?.detail || 'Revoke failed.', 'error')
          }
        }}
      />

      <ConfirmationModal
        open={deleteOpen}
        title={`Delete ${cert.public_id}?`}
        message="This permanently deletes the certificate record and PDF file so you can re-generate cleanly."
        danger
        confirmLabel="Delete"
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          try {
            await certificateService.deleteIssued(cert.id)
            showToast('Certificate deleted.', 'success')
            setDeleteOpen(false)
            navigate('/certificate/issued')
          } catch (err) {
            showToast(err?.response?.data?.detail || 'Delete failed.', 'error')
          }
        }}
      />
    </div>
  )
}
