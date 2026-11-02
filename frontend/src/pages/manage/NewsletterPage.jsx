import { useEffect, useState } from 'react'

import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import ManageToolbar from '../../components/manage/ManageToolbar'
import FaIcon from '../../components/manage/FaIcon'
import Pagination from '../../components/common/Pagination'
import Skeleton from '../../components/common/Skeleton'
import FormField from '../../components/forms/FormField'
import { useApi } from '../../hooks/useApi'
import { useManageFocus } from '../../hooks/useManageFocus'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'
import { getErrorMessage } from '../../utils/errors'
import { formatDate } from '../../utils/format'

const PAGE_SIZE = 12

const CAMPAIGN_KINDS = [
  { value: 'offer', label: 'Offer / sale' },
  { value: 'new_arrivals', label: 'New arrivals' },
  { value: 'custom', label: 'Custom message' },
]

const EMPTY_CAMPAIGN = {
  kind: 'offer',
  subject: '',
  message: '',
}

export default function NewsletterPage() {
  const { showToast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [campaign, setCampaign] = useState(EMPTY_CAMPAIGN)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [audience, setAudience] = useState(null)

  const { data, isLoading, error, reload } = useApi(
    () => portalService.listNewsletter({ page, page_size: PAGE_SIZE, search: query || undefined }),
    [page, query],
  )

  useEffect(() => {
    let cancelled = false
    portalService
      .newsletterAudience()
      .then((payload) => {
        if (!cancelled) setAudience(payload)
      })
      .catch(() => {
        if (!cancelled) setAudience(null)
      })
    return () => {
      cancelled = true
    }
  }, [data?.count])

  const openCampaignModal = () => {
    setCampaign(EMPTY_CAMPAIGN)
    setShowCampaignModal(true)
  }

  const handleSend = async (event) => {
    event.preventDefault()
    const total = audience?.total_recipients ?? 0
    if (total === 0) {
      showToast('No recipients yet — collect newsletter emails or wait for sign-ups.', 'error')
      return
    }
    const confirmed = window.confirm(
      `Send this ${CAMPAIGN_KINDS.find((item) => item.value === campaign.kind)?.label || 'email'} to ${total} recipient(s)?`,
    )
    if (!confirmed) return

    setIsSending(true)
    try {
      const result = await portalService.sendNewsletterCampaign({
        kind: campaign.kind,
        subject: campaign.subject.trim(),
        message: campaign.message.trim(),
      })
      showToast(result.detail || `Sent to ${result.sent} people.`, 'success')
      setCampaign(EMPTY_CAMPAIGN)
      setShowCampaignModal(false)
      const refreshed = await portalService.newsletterAudience()
      setAudience(refreshed)
    } catch (requestError) {
      showToast(getErrorMessage(requestError), 'error')
    } finally {
      setIsSending(false)
    }
  }

  useManageFocus({ ready: !isLoading })

  const recipientHint =
    audience != null
      ? `${audience.newsletter_subscribers} newsletter subscribers plus signed-up customers — ${audience.total_recipients} total recipients.`
      : 'Loading audience size…'

  return (
    <section aria-labelledby="manage-newsletter-title" data-manage-section="newsletter">
      <ManagePageHeader
        title="Newsletter"
        description="Collect emails from the storefront, then send offers and new-arrival updates to subscribers and signed-up customers."
        actions={
          <Button type="button" onClick={openCampaignModal}>
            <FaIcon icon="mail" className="mr-2 h-3.5 w-3.5" />
            Send email campaign
          </Button>
        }
      />

      {audience != null ? (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <FaIcon icon="mail" className="h-3.5 w-3.5 text-accent" />
          <span>
            {audience.total_recipients} recipient{audience.total_recipients === 1 ? '' : 's'} ready.
            Active coupons and sale products also email this list automatically.
          </span>
        </p>
      ) : null}

      <ManageToolbar
        search={
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setQuery(search.trim())
            }}
            className="flex w-full flex-wrap gap-2"
          >
            <div className="relative min-w-[12rem] flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-muted">
                <FaIcon icon="search" className="h-3.5 w-3.5" />
              </span>
              <input
                aria-label="Search subscribers"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email"
                className="min-h-11 w-full rounded-control border border-line bg-canvas py-2 pr-3 pl-9 text-sm"
              />
            </div>
            <button
              type="submit"
              aria-label="Search"
              title="Search"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-ink text-white shadow-[0_1px_2px_rgb(17_17_17/0.12)] transition-[background-color,box-shadow,transform] hover:bg-ink-soft hover:shadow-[0_4px_12px_rgb(17_17_17/0.14)] active:scale-[0.98]"
            >
              <FaIcon icon="search" className="h-4 w-4" />
            </button>
          </form>
        }
      />

      <Modal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        title="Send email campaign"
        size="wide"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowCampaignModal(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button type="submit" form="newsletter-campaign-form" isLoading={isSending}>
              Send to list
            </Button>
          </>
        }
      >
        <form id="newsletter-campaign-form" onSubmit={handleSend} className="space-y-4" noValidate>
          <p className="text-sm text-muted">{recipientHint}</p>
          <fieldset>
            <legend className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Campaign type</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {CAMPAIGN_KINDS.map((option) => (
                <label key={option.value} className="flex min-h-10 items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="campaign-kind"
                    value={option.value}
                    checked={campaign.kind === option.value}
                    onChange={() => setCampaign((current) => ({ ...current, kind: option.value }))}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <FormField
            label="Subject"
            required
            value={campaign.subject}
            onChange={(event) => setCampaign((current) => ({ ...current, subject: event.target.value }))}
            placeholder="e.g. Weekend glow sale — 15% off"
          />
          <FormField
            label="Message"
            as="textarea"
            required
            rows={5}
            value={campaign.message}
            onChange={(event) => setCampaign((current) => ({ ...current, message: event.target.value }))}
            placeholder="Write the offer or new-arrivals note customers will read…"
          />
        </form>
      </Modal>

      {isLoading ? <Skeleton className="mt-4 h-48 w-full" /> : null}
      {error ? <ErrorMessage error={error} onRetry={reload} className="mt-4" /> : null}
      {!isLoading && !error && data?.results?.length === 0 ? (
        <EmptyState title="No subscribers yet" message="Signup emails will appear here." className="mt-6" />
      ) : null}

      {!isLoading && !error && data?.results?.length > 0 ? (
        <>
          <ul className="manage-panel mt-4 divide-y divide-line">
            {data.results.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <span className="inline-flex min-w-0 items-center gap-2 font-medium break-all">
                  <FaIcon icon="mail" className="h-3.5 w-3.5 shrink-0 text-muted" />
                  {row.email}
                </span>
                <span className="text-xs text-muted">{formatDate(row.subscribed_at)}</span>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} totalCount={data.count} onPageChange={setPage} />
        </>
      ) : null}
    </section>
  )
}
