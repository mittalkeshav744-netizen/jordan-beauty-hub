import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import ConfirmationModal from '../../components/certificate/ConfirmationModal'
import DataTable from '../../components/certificate/DataTable'
import EmptyState from '../../components/certificate/EmptyState'
import LoadingState from '../../components/certificate/LoadingState'
import Pagination from '../../components/certificate/Pagination'
import SearchAndFilter from '../../components/certificate/SearchAndFilter'
import FaIcon from '../../components/manage/FaIcon'
import { useCertList } from '../../hooks/useCertList'
import { useToast } from '../../hooks/useToast'
import { certificateService } from '../../services/certificateService'

const iconBtn = 'cert-btn-outline cert-icon-btn'

export default function TemplatesPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const list = useCertList((params) => certificateService.listTemplates(params))
  const [deleteId, setDeleteId] = useState(null)

  const createDefault = async () => {
    try {
      const tpl = await certificateService.createTemplate({
        name: `Template ${new Date().toLocaleDateString()}`,
        source_type: 'editor',
        orientation: 'landscape',
        page_size: 'A4',
        is_active: true,
      })
      showToast('Template created.', 'success')
      navigate(`/certificate/templates/${tpl.id}/edit`)
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not create template.', 'error')
    }
  }

  return (
    <div>
      <SearchAndFilter
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search templates"
        actions={
          <>
            <Link to="/certificate/templates/create" className="cert-btn-outline cert-btn-sm">
              <FaIcon icon="upload" className="h-3.5 w-3.5" />
              Create / upload
            </Link>
            <button type="button" className="cert-btn-primary cert-btn-sm" onClick={createDefault}>
              <FaIcon icon="plus" className="h-3.5 w-3.5" />
              Quick editor template
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
              { key: 'name', header: 'Template', render: (r) => <span className="font-semibold">{r.name}</span> },
              {
                key: 'source_type',
                header: 'Type',
                render: (r) => <span className="cert-badge cert-badge--draft">{r.source_type || 'editor'}</span>,
              },
              {
                key: 'orientation',
                header: 'Orientation',
                render: (r) => <span className="capitalize">{r.orientation || '—'}</span>,
              },
              {
                key: 'is_default',
                header: 'Default',
                render: (r) =>
                  r.is_default ? <span className="cert-badge cert-badge--reissued">Default</span> : '—',
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <Link
                      className={iconBtn}
                      to={`/certificate/templates/${r.id}/edit`}
                      title="Edit"
                      aria-label={`Edit ${r.name}`}
                    >
                      <FaIcon icon="pen" className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      className={iconBtn}
                      title="Duplicate"
                      aria-label={`Duplicate ${r.name}`}
                      onClick={async () => {
                        try {
                          await certificateService.duplicateTemplate(r.id)
                          showToast('Template duplicated.', 'success')
                          list.reload()
                        } catch {
                          showToast('Duplicate failed.', 'error')
                        }
                      }}
                    >
                      <FaIcon icon="copy" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className={`${iconBtn} cert-icon-btn--danger`}
                      title="Delete"
                      aria-label={`Delete ${r.name}`}
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

      <ConfirmationModal
        open={Boolean(deleteId)}
        title="Delete template?"
        message="This removes the template. Templates already used to issue certificates cannot be deleted."
        danger
        confirmLabel="Delete"
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          try {
            await certificateService.deleteTemplate(deleteId)
            showToast('Template deleted.', 'success')
            setDeleteId(null)
            list.reload()
          } catch (err) {
            showToast(err?.response?.data?.detail || 'Could not delete template.', 'error')
          }
        }}
      />
    </div>
  )
}
