import { useEffect, useState } from 'react'

import EmptyState from '../../components/certificate/EmptyState'
import LoadingState from '../../components/certificate/LoadingState'
import StatCard from '../../components/certificate/StatCard'
import FaIcon from '../../components/manage/FaIcon'
import { useToast } from '../../hooks/useToast'
import { certificateService } from '../../services/certificateService'
import { downloadPdfBlob } from '../../utils/printPdfBlob'

const EXPORT_CARDS = [
  { type: 'issued', title: 'Issued certificates', hint: 'All issued, revoked & reissued serials', icon: 'award' },
  { type: 'emails', title: 'Email log', hint: 'Delivery attempts, timestamps & errors', icon: 'mail' },
  { type: 'courses', title: 'Course stats', hint: 'Enrollments and issuance per course', icon: 'courses' },
]

export default function ReportsPage() {
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    certificateService
      .reports()
      .then(setData)
      .catch((err) => setError(err?.response?.data?.detail || 'Failed to load reports.'))
  }, [])

  const exportReport = async (type, fileFormat) => {
    const key = `${type}-${fileFormat}`
    setBusy(key)
    try {
      const blob = await certificateService.exportReport({ type, file_format: fileFormat })
      downloadPdfBlob(blob, `${type}-report.${fileFormat}`)
      showToast('Download started.', 'success')
    } catch {
      showToast('Export failed.', 'error')
    } finally {
      setBusy('')
    }
  }

  if (!data && !error) return <LoadingState />
  if (error) return <EmptyState icon="info" title="Could not load reports" message={error} />

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        {EXPORT_CARDS.map((item) => (
          <div key={item.type} className="cert-card flex flex-col justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-[var(--cert-gold-soft)] text-[var(--cert-navy)]">
                <FaIcon icon={item.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--cert-navy)]">{item.title}</p>
                <p className="text-xs text-[var(--cert-muted)]">{item.hint}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="cert-btn-outline cert-btn-sm flex-1"
                disabled={Boolean(busy)}
                onClick={() => exportReport(item.type, 'csv')}
              >
                <FaIcon icon="download" className="h-3.5 w-3.5" />
                {busy === `${item.type}-csv` ? 'Exporting…' : 'CSV'}
              </button>
              <button
                type="button"
                className="cert-btn-outline cert-btn-sm flex-1"
                disabled={Boolean(busy)}
                onClick={() => exportReport(item.type, 'xlsx')}
              >
                <FaIcon icon="download" className="h-3.5 w-3.5" />
                {busy === `${item.type}-xlsx` ? 'Exporting…' : 'Excel'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Issued" value={data.total_issued_certificates} icon="award" tone="gold" />
        <StatCard label="Pending" value={data.pending_certificates} icon="jobs" />
        <StatCard label="Emails sent" value={data.emails_sent} icon="mail" tone="success" />
        <StatCard
          label="Emails failed"
          value={data.emails_failed}
          icon="ban"
          tone={data.emails_failed > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cert-card p-4 sm:p-5">
          <h2 className="font-[family-name:var(--font-cert-display)] text-lg font-semibold text-[var(--cert-navy)]">
            Certificates by status
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.entries(data.certificates_by_status || {}).map(([status, count]) => (
              <li key={status} className="flex justify-between border-b border-[var(--cert-line)] py-2 last:border-0">
                <span className="capitalize">{status}</span>
                <span className="font-semibold text-[var(--cert-navy)]">{count}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="cert-card p-4 sm:p-5">
          <h2 className="font-[family-name:var(--font-cert-display)] text-lg font-semibold text-[var(--cert-navy)]">
            Emails by status
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.entries(data.emails_by_status || {}).map(([status, count]) => (
              <li key={status} className="flex justify-between border-b border-[var(--cert-line)] py-2 last:border-0">
                <span className="capitalize">{status}</span>
                <span className="font-semibold text-[var(--cert-navy)]">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="cert-card p-4 sm:p-5">
        <h2 className="font-[family-name:var(--font-cert-display)] text-lg font-semibold text-[var(--cert-navy)]">
          Course-wise issued
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(data.course_stats || []).map((row) => (
            <li key={row.id} className="flex justify-between gap-3 border-b border-[var(--cert-line)] py-2 last:border-0">
              <span>{row.title}</span>
              <span className="font-semibold text-[var(--cert-navy)]">{row.certificate_count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
