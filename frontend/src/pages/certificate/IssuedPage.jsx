import { useState } from 'react'
import { Link } from 'react-router'

import CertificateStatusBadge from '../../components/certificate/CertificateStatusBadge'
import ConfirmationModal from '../../components/certificate/ConfirmationModal'
import DataTable from '../../components/certificate/DataTable'
import EmailStatusBadge from '../../components/certificate/EmailStatusBadge'
import EmptyState from '../../components/certificate/EmptyState'
import LoadingState from '../../components/certificate/LoadingState'
import Pagination from '../../components/certificate/Pagination'
import SearchAndFilter from '../../components/certificate/SearchAndFilter'
import FaIcon from '../../components/manage/FaIcon'
import { useCertList } from '../../hooks/useCertList'
import { useToast } from '../../hooks/useToast'
import { certificateService } from '../../services/certificateService'
import { downloadPdfBlob, printPdfBlob } from '../../utils/printPdfBlob'

const iconBtn = 'cert-btn-outline cert-icon-btn'

export default function IssuedPage() {
  const { showToast } = useToast()
  const list = useCertList((params) => certificateService.listIssued(params))
  const [selected, setSelected] = useState(() => new Set())
  const [printBusy, setPrintBusy] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const printCertificates = async (ids, label) => {
    if (!ids.length) return
    setPrintBusy(true)
    try {
      const blob =
        ids.length === 1
          ? await certificateService.printPdf(ids[0])
          : await certificateService.printBundle({ certificate_ids: ids, fit_a4: true })
      printPdfBlob(blob, label)
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not open print dialog.', 'error')
    } finally {
      setPrintBusy(false)
    }
  }

  const downloadCertificates = async (ids, filename) => {
    if (!ids.length) return
    setPrintBusy(true)
    try {
      const blob =
        ids.length === 1
          ? await certificateService.downloadPdf(ids[0])
          : await certificateService.printBundle({ certificate_ids: ids, fit_a4: false })
      downloadPdfBlob(blob, filename)
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Download failed.', 'error')
    } finally {
      setPrintBusy(false)
    }
  }

  return (
    <div>
      <SearchAndFilter
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search certificate ID or student"
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: list.filters.status || '',
            onChange: (value) => list.setFilters((f) => ({ ...f, status: value || undefined })),
            options: [
              { value: '', label: 'All statuses' },
              { value: 'issued', label: 'Issued' },
              { value: 'revoked', label: 'Revoked' },
              { value: 'reissued', label: 'Reissued' },
              { value: 'draft', label: 'Draft' },
            ],
          },
        ]}
        actions={
          <>
            <button
              type="button"
              className="cert-btn-primary cert-btn-sm"
              disabled={!selected.size || printBusy}
              onClick={() => printCertificates([...selected], `Print ${selected.size} certificates`)}
            >
              <FaIcon icon="print" className="h-3.5 w-3.5" />
              {printBusy ? 'Preparing…' : `Print selected (${selected.size})`}
            </button>
            <button
              type="button"
              className="cert-btn-outline cert-btn-sm"
              disabled={!selected.size || printBusy}
              onClick={() =>
                downloadCertificates(
                  [...selected],
                  selected.size === 1 ? 'certificate.pdf' : 'certificates-bundle.pdf',
                )
              }
            >
              <FaIcon icon="download" className="h-3.5 w-3.5" />
              Download PDF
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
              {
                key: 'public_id',
                header: 'Certificate ID',
                render: (r) => (
                  <Link className="font-semibold text-[var(--cert-navy)] underline-offset-2 hover:underline" to={`/certificate/issued/${r.id}`}>
                    {r.public_id}
                  </Link>
                ),
              },
              { key: 'student_name', header: 'Student' },
              { key: 'course_title', header: 'Course' },
              { key: 'group_name', header: 'Group', render: (r) => r.group_name || '—' },
              { key: 'issue_date', header: 'Issued' },
              { key: 'status', header: 'Status', render: (r) => <CertificateStatusBadge status={r.status} /> },
              { key: 'email_status', header: 'Email', render: (r) => <EmailStatusBadge status={r.email_status} /> },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      className={iconBtn}
                      title="Print"
                      aria-label={`Print ${r.public_id}`}
                      disabled={printBusy}
                      onClick={() => printCertificates([r.id], `Print ${r.public_id}`)}
                    >
                      <FaIcon icon="print" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className={iconBtn}
                      title="Download PDF"
                      aria-label={`Download ${r.public_id}`}
                      disabled={printBusy}
                      onClick={() => downloadCertificates([r.id], `${r.public_id}.pdf`)}
                    >
                      <FaIcon icon="download" className="h-3.5 w-3.5" />
                    </button>
                    <Link
                      to={`/certificate/issued/${r.id}`}
                      className={iconBtn}
                      title="View details"
                      aria-label={`View ${r.public_id}`}
                    >
                      <FaIcon icon="eye" className="h-3.5 w-3.5" />
                    </Link>
                    {r.status === 'issued' ? (
                      <button
                        type="button"
                        className={`${iconBtn} cert-icon-btn--danger`}
                        title="Cancel / revoke certificate"
                        aria-label={`Cancel ${r.public_id}`}
                        disabled={actionBusy}
                        onClick={() => setConfirmAction({ mode: 'revoke', cert: r })}
                      >
                        <FaIcon icon="ban" className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`${iconBtn} cert-icon-btn--danger`}
                      title="Delete certificate"
                      aria-label={`Delete ${r.public_id}`}
                      disabled={actionBusy}
                      onClick={() => setConfirmAction({ mode: 'delete', cert: r })}
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

      <ConfirmationModal
        open={Boolean(confirmAction)}
        title={
          confirmAction?.mode === 'delete'
            ? `Delete ${confirmAction?.cert?.public_id}?`
            : `Cancel / revoke ${confirmAction?.cert?.public_id}?`
        }
        message={
          confirmAction?.mode === 'delete'
            ? 'This permanently removes the certificate record and PDF file so you can re-generate cleanly. This cannot be undone.'
            : 'This cancels the certificate and marks it revoked so public QR/serial checks show it as invalid.'
        }
        danger
        busy={actionBusy}
        confirmLabel={confirmAction?.mode === 'delete' ? 'Delete' : 'Cancel certificate'}
        onClose={() => !actionBusy && setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction?.cert) return
          const { mode, cert } = confirmAction
          setActionBusy(true)
          try {
            if (mode === 'delete') {
              await certificateService.deleteIssued(cert.id)
              setSelected((prev) => {
                const next = new Set(prev)
                next.delete(cert.id)
                return next
              })
              showToast(`Deleted ${cert.public_id}.`, 'success')
            } else {
              await certificateService.revoke(cert.id, 'Cancelled by administrator')
              showToast(`Cancelled ${cert.public_id}.`, 'success')
            }
            setConfirmAction(null)
            list.reload()
          } catch (err) {
            showToast(err?.response?.data?.detail || 'Action failed.', 'error')
          } finally {
            setActionBusy(false)
          }
        }}
      />
    </div>
  )
}
