import { useState } from 'react'

import DataTable from '../../components/certificate/DataTable'
import EmptyState from '../../components/certificate/EmptyState'
import LoadingState from '../../components/certificate/LoadingState'
import FaIcon from '../../components/manage/FaIcon'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { certificateService } from '../../services/certificateService'
import { formatDate } from '../../utils/format'

export default function JobsPage() {
  const { showToast } = useToast()
  const { data, isLoading, error, reload } = useApi(() => certificateService.listJobs({ page_size: 30 }), [])
  const [processing, setProcessing] = useState(false)
  const jobs = data?.results || []

  const processQueue = async () => {
    setProcessing(true)
    try {
      const result = await certificateService.processQueue(50)
      const sent = result.sent ?? result.processed ?? 0
      const failed = result.failed ?? 0
      showToast(
        `Queue processed: ${sent} sent${failed ? `, ${failed} failed` : ''}.`,
        failed ? 'error' : 'success',
      )
      reload()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not process queue.', 'error')
    } finally {
      setProcessing(false)
    }
  }

  if (isLoading) return <LoadingState />

  return (
    <div className="space-y-4">
      <div className="cert-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-cert-display)] text-xl font-semibold text-[var(--cert-navy)]">
            <FaIcon icon="jobs" className="h-4 w-4 text-[var(--cert-gold)]" />
            Certificate jobs
          </h2>
          <p className="mt-1 text-sm text-[var(--cert-muted)]">
            Generation and scheduled email jobs. Use process queue to send due certificate emails now.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cert-btn-outline cert-icon-btn"
            onClick={reload}
            title="Refresh jobs"
            aria-label="Refresh jobs"
          >
            <FaIcon icon="retry" className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="cert-btn-primary cert-btn-sm" disabled={processing} onClick={processQueue}>
            <FaIcon icon="mail" className="h-3.5 w-3.5" />
            {processing ? 'Processing…' : 'Process email queue'}
          </button>
        </div>
      </div>

      {error ? (
        <EmptyState
          icon="info"
          title="Could not load jobs"
          message="Please try refreshing the job queue."
          action={
            <button type="button" className="cert-btn-outline cert-btn-sm" onClick={reload}>
              <FaIcon icon="retry" className="h-3.5 w-3.5" />
              Retry
            </button>
          }
        />
      ) : null}

      {!error && jobs.length === 0 ? (
        <EmptyState icon="jobs" title="No jobs yet" message="Batch generation and email jobs will appear here." />
      ) : null}

      {!error && jobs.length > 0 ? (
        <DataTable
          rows={jobs}
          columns={[
            { key: 'id', header: 'ID', render: (job) => <span className="font-semibold">#{job.id}</span> },
            {
              key: 'job_type',
              header: 'Type',
              render: (job) => <span className="capitalize">{job.job_type || job.type || '—'}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (job) => {
                const status = String(job.status || 'pending').toLowerCase()
                return <span className={`cert-badge cert-badge--${status}`}>{status}</span>
              },
            },
            {
              key: 'progress',
              header: 'Progress',
              render: (job) => (job.total ? `${job.current ?? 0} / ${job.total}` : '—'),
            },
            {
              key: 'created_at',
              header: 'Created',
              render: (job) => (
                <span className="text-[var(--cert-muted)]">
                  {job.created_at ? formatDate(job.created_at) : '—'}
                </span>
              ),
            },
          ]}
        />
      ) : null}
    </div>
  )
}
