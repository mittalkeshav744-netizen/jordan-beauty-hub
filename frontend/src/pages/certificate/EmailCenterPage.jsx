import { useState } from 'react'

import DataTable from '../../components/certificate/DataTable'
import EmailStatusBadge from '../../components/certificate/EmailStatusBadge'
import EmptyState from '../../components/certificate/EmptyState'
import LoadingState from '../../components/certificate/LoadingState'
import Pagination from '../../components/certificate/Pagination'
import SearchAndFilter from '../../components/certificate/SearchAndFilter'
import { useCertList } from '../../hooks/useCertList'
import { useToast } from '../../hooks/useToast'
import FaIcon from '../../components/manage/FaIcon'
import { certificateService } from '../../services/certificateService'

export default function EmailCenterPage() {
  const { showToast } = useToast()
  const list = useCertList((params) => certificateService.listEmailLogs(params))
  const [selected, setSelected] = useState(() => new Set())

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <SearchAndFilter
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search email logs"
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: list.filters.status || '',
            onChange: (value) => list.setFilters((f) => ({ ...f, status: value || undefined })),
            options: [
              { value: '', label: 'All' },
              { value: 'sent', label: 'Sent' },
              { value: 'failed', label: 'Failed' },
              { value: 'pending', label: 'Pending' },
              { value: 'sending', label: 'Sending' },
            ],
          },
        ]}
        actions={
          <button
            type="button"
            className="cert-btn-primary cert-btn-sm"
            disabled={!selected.size}
            onClick={async () => {
              try {
                const certIds = list.data.results
                  .filter((row) => selected.has(row.id))
                  .map((row) => row.certificate)
                await certificateService.bulkEmail({ certificate_ids: certIds, force: true })
                showToast('Bulk email job started.', 'success')
                list.reload()
              } catch (err) {
                showToast(err?.response?.data?.detail || 'Bulk send failed.', 'error')
              }
            }}
          >
            <FaIcon icon="mail" className="h-3.5 w-3.5" />
            Resend selected ({selected.size})
          </button>
        }
      />
      {list.loading ? <LoadingState /> : null}
      {list.error ? <EmptyState icon="info" title="Error" message={list.error} /> : null}
      {!list.loading && !list.error ? (
        <>
          <DataTable
            rows={list.data.results}
            selectedIds={selected}
            onToggle={toggle}
            onToggleAll={() => {
              const ids = list.data.results.map((r) => r.id)
              setSelected((prev) => {
                const all = ids.every((id) => prev.has(id))
                return all ? new Set() : new Set(ids)
              })
            }}
            columns={[
              { key: 'certificate_public_id', header: 'Certificate', render: (r) => <span className="font-semibold">{r.certificate_public_id}</span> },
              { key: 'student_name', header: 'Student' },
              { key: 'to_email', header: 'To' },
              { key: 'status', header: 'Status', render: (r) => <EmailStatusBadge status={r.status} /> },
              { key: 'attempts', header: 'Attempts' },
              {
                key: 'scheduled_for',
                header: 'Scheduled',
                render: (r) =>
                  r.scheduled_for ? new Date(r.scheduled_for).toLocaleString() : '—',
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) =>
                  r.status === 'failed' ? (
                    <button
                      type="button"
                      className="cert-btn-outline cert-icon-btn"
                      title="Retry"
                      aria-label={`Retry email for ${r.certificate_public_id}`}
                      onClick={async () => {
                        try {
                          await certificateService.retryEmail(r.id)
                          showToast('Retry sent.', 'success')
                          list.reload()
                        } catch (err) {
                          showToast(err?.response?.data?.detail || 'Retry failed.', 'error')
                        }
                      }}
                    >
                      <FaIcon icon="retry" className="h-3.5 w-3.5" />
                    </button>
                  ) : null,
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
    </div>
  )
}
