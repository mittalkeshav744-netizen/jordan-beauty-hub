import { useState } from 'react'

import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import FaIcon from '../../components/manage/FaIcon'
import Pagination from '../../components/common/Pagination'
import Skeleton from '../../components/common/Skeleton'
import { useApi } from '../../hooks/useApi'
import { useManageFocus } from '../../hooks/useManageFocus'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'
import { formatDate } from '../../utils/format'

const PAGE_SIZE = 12

function looksFromResponse(data) {
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data)) return data
  return []
}

function LookThumb({ look }) {
  const thumb = look.cover_image_url || (Array.isArray(look.preview_images) ? look.preview_images[0] : '') || ''
  if (thumb) {
    return (
      <img
        src={thumb}
        alt=""
        className="h-40 w-full object-cover bg-subtle"
        loading="lazy"
      />
    )
  }
  return (
    <div className="flex h-40 items-center justify-center bg-cream px-4 text-center">
      <span className="font-display text-base font-semibold text-ink-soft">{look.title || 'Look'}</span>
    </div>
  )
}

export default function LooksPage() {
  const { showToast } = useToast()
  const [page, setPage] = useState(1)
  const { data, isLoading, error, reload, setData } = useApi(
    () => portalService.listLooks({ page, page_size: PAGE_SIZE }),
    [page],
  )

  const looks = looksFromResponse(data)
  const totalCount = Number(data?.count ?? looks.length) || 0
  const liveCount = looks.filter((look) => Boolean(look.is_active)).length
  const draftCount = looks.length - liveCount

  const toggleActive = async (look) => {
    try {
      const updated = await portalService.updateLook(look.id, { is_active: !look.is_active })
      const nextResults = looks.map((row) =>
        row.id === look.id ? { ...row, ...updated, is_active: updated.is_active } : row,
      )
      setData({
        count: data?.count ?? nextResults.length,
        next: data?.next ?? null,
        previous: data?.previous ?? null,
        results: nextResults,
      })
      showToast(updated.is_active ? 'Look published.' : 'Look unpublished.', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not update look.', 'error')
    }
  }

  useManageFocus({ ready: !isLoading })

  return (
    <section aria-labelledby="manage-looks-title" data-manage-section="looks">
      <ManagePageHeader
        title="Looks"
        description="Publish or hide makeup looks on the storefront."
      />

      {!isLoading && !error && totalCount > 0 ? (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="manage-kpi p-4">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase">
              <FaIcon icon="looks" className="h-3.5 w-3.5 text-berry" />
              Total looks
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">{totalCount}</p>
          </div>
          <div className="manage-kpi p-4">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase">
              <FaIcon icon="check" className="h-3.5 w-3.5 text-success" />
              Published (page)
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-success">{liveCount}</p>
          </div>
          <div className="manage-kpi col-span-2 p-4 sm:col-span-1">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase">
              <FaIcon icon="eye" className="h-3.5 w-3.5" />
              Drafts (page)
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-muted">{draftCount}</p>
          </div>
        </div>
      ) : null}

      {isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {error ? <ErrorMessage error={error} onRetry={reload} /> : null}

      {!isLoading && !error && looks.length === 0 ? (
        <EmptyState
          title="No looks yet"
          message="Run python manage.py seed_catalog in the backend folder, then refresh."
        />
      ) : null}

      {!isLoading && !error && looks.length > 0 ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {looks.map((look) => (
              <li
                key={look.id}
                className="manage-panel flex flex-col overflow-hidden"
              >
                <div className="relative">
                  <LookThumb look={look} />
                  <span
                    className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-control px-2 py-1 text-[0.65rem] font-semibold tracking-wide uppercase ${
                      look.is_active ? 'bg-success-soft text-success' : 'bg-canvas text-muted'
                    }`}
                  >
                    {look.is_active ? (
                      <>
                        <FaIcon icon="check" className="h-3 w-3" />
                        Published
                      </>
                    ) : (
                      'Draft'
                    )}
                  </span>
                  {look.occasion ? (
                    <span className="absolute top-3 right-3 rounded-control bg-ink/80 px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-white uppercase">
                      {look.occasion}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <h2 className="flex items-start gap-2 text-base font-semibold text-ink">
                      <FaIcon icon="looks" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      <span className="min-w-0">{look.title}</span>
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                      {look.description || 'No description yet.'}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      {Number(look.step_count) || 0} steps
                      {look.updated_at ? ` · updated ${formatDate(look.updated_at)}` : ''}
                    </p>
                    {Array.isArray(look.step_labels) && look.step_labels.length > 0 ? (
                      <p className="mt-2 line-clamp-2 text-xs text-muted">{look.step_labels.join(' · ')}</p>
                    ) : null}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(look)}
                      className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-btn px-3 text-xs font-semibold tracking-[0.04em] transition-colors ${
                        look.is_active
                          ? 'border border-line hover:bg-subtle'
                          : 'bg-ink text-white hover:bg-ink-soft'
                      }`}
                    >
                      {look.is_active ? (
                        <>
                          <FaIcon icon="eye" className="h-3 w-3" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <FaIcon icon="check" className="h-3 w-3" />
                          Publish
                        </>
                      )}
                    </button>
                    {look.slug ? (
                      <a
                        href={`/looks/${look.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-btn border border-line px-3 text-xs font-semibold tracking-[0.04em] transition-colors hover:bg-subtle"
                      >
                        <FaIcon icon="eye" className="h-3 w-3" />
                        View
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
        </>
      ) : null}
    </section>
  )
}
