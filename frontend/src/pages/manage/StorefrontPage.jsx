import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import Button from '../../components/common/Button'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import Modal from '../../components/common/Modal'
import Skeleton from '../../components/common/Skeleton'
import FaIcon from '../../components/manage/FaIcon'
import ManagePageHeader from '../../components/manage/ManagePageHeader'
import { STOREFRONT_FOCUS_TAB } from '../../constants/websiteContentMap'
import { useApi } from '../../hooks/useApi'
import { useManageFocus } from '../../hooks/useManageFocus'
import { useToast } from '../../hooks/useToast'
import { clearStorefrontCache } from '../../hooks/useStorefront'
import { portalService } from '../../services/portalService'
import { getErrorMessage } from '../../utils/errors'
import {
  buildStorefrontForm,
  heroPreviewSrc,
  reelPreviewSrc,
  storefrontWritePayload,
} from '../../utils/storefrontForm'

const TABS = [
  { id: 'hero', label: 'Hero & Banner' },
  { id: 'reels', label: 'Watch & Shop Reels' },
  { id: 'sections', label: 'Sections & Ordering' },
  { id: 'content', label: 'Ticker & Trust Badges' },
]

function emptyReelForm() {
  return {
    title: '',
    video_url: '',
    video_file: null,
    link_url: '/shop',
    start_seconds: 0,
    loop_end_seconds: 7,
    is_active: true,
  }
}

export default function StorefrontPage() {
  const [activeTab, setActiveTab] = useState('hero')
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const focus = searchParams.get('focus')
  const focusTab = focus ? STOREFRONT_FOCUS_TAB[focus] : null

  useEffect(() => {
    if (focusTab) setActiveTab(focusTab)
  }, [focusTab])

  const {
    data: configData,
    isLoading: isConfigLoading,
    error: configError,
    reload: reloadConfig,
    setData: setConfigData,
  } = useApi(() => portalService.getStorefrontConfig(), [])

  const {
    data: reelsData,
    isLoading: isReelsLoading,
    reload: reloadReels,
    setData: setReelsData,
  } = useApi(() => portalService.listStorefrontReels(), [])

  const [configForm, setConfigFormState] = useState(null)
  const [isDirty, setIsDirty] = useState(false)

  useManageFocus({
    ready:
      (!focusTab || activeTab === focusTab) &&
      (activeTab === 'reels' || Boolean(configForm)),
  })

  useEffect(() => {
    if (!configData || isDirty) return
    setConfigFormState(buildStorefrontForm(configData))
  }, [configData, isDirty])

  const setConfigForm = (updater) => {
    setIsDirty(true)
    setConfigFormState((prev) => {
      const current = prev ?? buildStorefrontForm(configData)
      if (!current) return prev
      return typeof updater === 'function' ? updater(current) : updater
    })
  }

  const [heroVideoFile, setHeroVideoFile] = useState(null)
  const [newRotatingLine, setNewRotatingLine] = useState('')
  const [newMarqueeItem, setNewMarqueeItem] = useState('')
  const [isSavingConfig, setIsSavingConfig] = useState(false)

  const [reelModalOpen, setReelModalOpen] = useState(false)
  const [editingReelId, setEditingReelId] = useState(null)
  const [reelForm, setReelForm] = useState(emptyReelForm)
  const [isSavingReel, setIsSavingReel] = useState(false)
  const [deletingReel, setDeletingReel] = useState(null)
  const [isDeletingReel, setIsDeletingReel] = useState(false)

  const handleSaveConfig = async (e) => {
    if (e) e.preventDefault()
    if (!configForm) return
    setIsSavingConfig(true)
    try {
      const saved = await portalService.updateStorefrontConfig(
        storefrontWritePayload(configForm, heroVideoFile),
      )
      setHeroVideoFile(null)
      setConfigData(saved)
      setConfigFormState(buildStorefrontForm(saved))
      setIsDirty(false)
      clearStorefrontCache()
      showToast('Storefront changes saved.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err) || 'Failed to save storefront changes.', 'error')
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleAddRotatingLine = (e) => {
    e.preventDefault()
    const line = newRotatingLine.trim()
    if (!line) return
    setConfigForm((prev) => ({
      ...prev,
      hero_rotating_lines: [...prev.hero_rotating_lines, line],
    }))
    setNewRotatingLine('')
  }

  const handleRemoveRotatingLine = (index) => {
    setConfigForm((prev) => ({
      ...prev,
      hero_rotating_lines: prev.hero_rotating_lines.filter((_, i) => i !== index),
    }))
  }

  // --- Marquee & Badges Handlers ---
  const handleAddMarqueeItem = (e) => {
    e.preventDefault()
    const item = newMarqueeItem.trim()
    if (!item) return
    setConfigForm((prev) => ({
      ...prev,
      marquee_items: [...prev.marquee_items, item],
    }))
    setNewMarqueeItem('')
  }

  const handleRemoveMarqueeItem = (index) => {
    setConfigForm((prev) => ({
      ...prev,
      marquee_items: prev.marquee_items.filter((_, i) => i !== index),
    }))
  }

  const handleBenefitChange = (index, field, value) => {
    setConfigForm((prev) => {
      const updated = [...prev.benefits]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, benefits: updated }
    })
  }

  const handleAddBenefit = () => {
    setConfigForm((prev) => ({
      ...prev,
      benefits: [...prev.benefits, { title: 'New Benefit', text: 'Benefit details here.' }],
    }))
  }

  const handleRemoveBenefit = (index) => {
    setConfigForm((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }))
  }

  const handleBudgetTileChange = (index, field, value) => {
    setConfigForm((prev) => {
      const updated = [...(prev.budget_tiles || [])]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, budget_tiles: updated }
    })
  }

  const handleAddBudgetTile = () => {
    setConfigForm((prev) => ({
      ...prev,
      budget_tiles: [
        ...(prev.budget_tiles || []),
        { label: 'Under', amount: '₹499', to: '/shop?max_price=499' },
      ],
    }))
  }

  const handleRemoveBudgetTile = (index) => {
    setConfigForm((prev) => ({
      ...prev,
      budget_tiles: (prev.budget_tiles || []).filter((_, i) => i !== index),
    }))
  }

  // --- Section Layout & Ordering Handlers ---
  const handleToggleSection = (id) => {
    setConfigForm((prev) => ({
      ...prev,
      sections_order: prev.sections_order.map((sec) =>
        sec.id === id ? { ...sec, enabled: !sec.enabled } : sec,
      ),
    }))
  }

  const handleMoveSection = (index, direction) => {
    setConfigForm((prev) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= prev.sections_order.length) return prev
      const updated = [...prev.sections_order]
      const [moved] = updated.splice(index, 1)
      updated.splice(targetIndex, 0, moved)
      return { ...prev, sections_order: updated }
    })
  }

  // --- Reels Handlers ---
  const handleOpenAddReel = () => {
    setEditingReelId(null)
    setReelForm(emptyReelForm())
    setReelModalOpen(true)
  }

  const handleOpenEditReel = (reel) => {
    setEditingReelId(reel.id)
    setReelForm({
      title: reel.title,
      video_url: reel.video_url || '',
      video_file: null,
      link_url: reel.link_url || '/shop',
      start_seconds: reel.start_seconds ?? 0,
      loop_end_seconds: reel.loop_end_seconds ?? 7,
      is_active: reel.is_active,
    })
    setReelModalOpen(true)
  }

  const handleSaveReel = async (e) => {
    e.preventDefault()
    setIsSavingReel(true)
    try {
      if (editingReelId) {
        await portalService.updateStorefrontReel(editingReelId, reelForm)
        showToast('Video reel updated.', 'success')
      } else {
        await portalService.createStorefrontReel(reelForm)
        showToast('Video reel added.', 'success')
      }
      setReelModalOpen(false)
      clearStorefrontCache()
      reloadReels()
    } catch (err) {
      showToast(getErrorMessage(err) || 'Failed to save video reel.', 'error')
    } finally {
      setIsSavingReel(false)
    }
  }

  const handleDeleteReel = async () => {
    if (!deletingReel) return
    setIsDeletingReel(true)
    try {
      await portalService.deleteStorefrontReel(deletingReel.id)
      showToast('Video reel removed.', 'success')
      setDeletingReel(null)
      clearStorefrontCache()
      reloadReels()
    } catch (err) {
      showToast(getErrorMessage(err) || 'Failed to delete video reel.', 'error')
    } finally {
      setIsDeletingReel(false)
    }
  }

  const handleToggleReelActive = async (reel) => {
    const previous = reelsData
    setReelsData(
      (reelsData || []).map((item) =>
        item.id === reel.id ? { ...item, is_active: !item.is_active } : item,
      ),
    )
    try {
      await portalService.updateStorefrontReel(reel.id, { is_active: !reel.is_active })
      clearStorefrontCache()
    } catch (err) {
      setReelsData(previous)
      showToast(getErrorMessage(err) || 'Failed to update reel status.', 'error')
    }
  }

  const handleMoveReel = async (index, direction) => {
    if (!reelsData) return
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= reelsData.length) return
    const previous = reelsData
    const updated = [...reelsData]
    const [moved] = updated.splice(index, 1)
    updated.splice(targetIndex, 0, moved)
    setReelsData(updated)
    try {
      const ordered = await portalService.reorderStorefrontReels(updated.map((r) => r.id))
      if (Array.isArray(ordered)) setReelsData(ordered)
      clearStorefrontCache()
    } catch (err) {
      setReelsData(previous)
      showToast(getErrorMessage(err) || 'Failed to reorder reels.', 'error')
    }
  }

  if (configError) {
    return <ErrorMessage error={configError} onRetry={reloadConfig} />
  }

  if ((isConfigLoading || !configForm) && !configError) {
    return <Skeleton className="h-96 w-full rounded-card" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ManagePageHeader
          title="Storefront & Homepage"
          description="Customise the hero video, rotating headlines, watch & shop reels, and homepage section order."
        />
        <div className="flex flex-wrap items-center gap-2">
          {isDirty && (
            <span className="rounded-control bg-accent-soft px-2.5 py-1 text-[0.65rem] font-bold tracking-wider text-accent uppercase">
              Unsaved changes
            </span>
          )}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-line bg-canvas px-4 text-xs font-semibold tracking-wider text-ink uppercase hover:bg-subtle"
          >
            <FaIcon icon="store" className="h-3.5 w-3.5" />
            <span>Live Storefront</span>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line">
        <nav className="scrollbar-hide -mb-px flex gap-4 overflow-x-auto" aria-label="Storefront Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:border-line hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB 1: HERO & BANNER */}
      {activeTab === 'hero' && configForm && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* Announcement Bar */}
          <div
            data-manage-section="announcement"
            className="rounded-card border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink">Announcement Bar (Top Strip)</h2>
                <p className="text-xs text-muted">Displays at the very top of every store page.</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configForm.announcement_enabled}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, announcement_enabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-accent focus:ring-accent"
                />
                <span className="text-xs font-semibold text-ink">Enabled</span>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                  Announcement Message
                </label>
                <input
                  type="text"
                  value={configForm.announcement_text}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, announcement_text: e.target.value })
                  }
                  placeholder="e.g. Cash on delivery available across India"
                  className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                  Target Link (Optional)
                </label>
                <input
                  type="text"
                  value={configForm.announcement_link}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, announcement_link: e.target.value })
                  }
                  placeholder="e.g. /shop?category=sale"
                  className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Hero Banner Content */}
          <div
            data-manage-section="hero"
            className="rounded-card border border-line bg-surface p-5 sm:p-6 space-y-5 shadow-card"
          >
            <div>
              <h2 className="text-base font-bold text-ink">Hero Banner Content</h2>
              <p className="text-xs text-muted">The main banner at the top of the homepage.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                  Pre-headline Tag
                </label>
                <input
                  type="text"
                  value={configForm.hero_tag}
                  onChange={(e) => setConfigForm({ ...configForm, hero_tag: e.target.value })}
                  placeholder="e.g. New season edit"
                  className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                  Main Headline
                </label>
                <input
                  type="text"
                  value={configForm.hero_title}
                  onChange={(e) => setConfigForm({ ...configForm, hero_title: e.target.value })}
                  placeholder="e.g. Bold colour."
                  className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Rotating Lines Manager */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                Rotating Taglines
              </label>
              <div className="flex flex-wrap gap-2">
                {configForm.hero_rotating_lines.map((line, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent"
                  >
                    <span>{line}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRotatingLine(idx)}
                      className="hover:text-danger focus:outline-none"
                      title="Remove line"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newRotatingLine}
                  onChange={(e) => setNewRotatingLine(e.target.value)}
                  placeholder="Add another rotating line (e.g. Glow all day.)..."
                  className="flex-1 rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
                <Button type="button" variant="outline" onClick={handleAddRotatingLine}>
                  Add line
                </Button>
              </div>
            </div>

            {/* CTAs */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                  Primary Button Text &amp; Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={configForm.hero_primary_cta_text}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, hero_primary_cta_text: e.target.value })
                    }
                    placeholder="Shop the drop"
                    className="w-1/2 rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                  <input
                    type="text"
                    value={configForm.hero_primary_cta_link}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, hero_primary_cta_link: e.target.value })
                    }
                    placeholder="/shop"
                    className="w-1/2 rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                  Secondary Button Text &amp; Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={configForm.hero_secondary_cta_text}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, hero_secondary_cta_text: e.target.value })
                    }
                    placeholder="Build your routine"
                    className="w-1/2 rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                  <input
                    type="text"
                    value={configForm.hero_secondary_cta_link}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, hero_secondary_cta_link: e.target.value })
                    }
                    placeholder="/skin-quiz"
                    className="w-1/2 rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hero Media Settings */}
          <div className="rounded-card border border-line bg-surface p-5 sm:p-6 space-y-5 shadow-card">
            <div>
              <h2 className="text-base font-bold text-ink">Hero Media Display</h2>
              <p className="text-xs text-muted">Choose between video playback or dynamic floating cards.</p>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hero_media_type"
                  value="video"
                  checked={configForm.hero_media_type === 'video'}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, hero_media_type: e.target.value })
                  }
                  className="text-accent focus:ring-accent"
                />
                <span className="text-sm font-semibold text-ink">Video Banner</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hero_media_type"
                  value="collage"
                  checked={configForm.hero_media_type === 'collage'}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, hero_media_type: e.target.value })
                  }
                  className="text-accent focus:ring-accent"
                />
                <span className="text-sm font-semibold text-ink">Floating Bestseller Products</span>
              </label>
            </div>

            {configForm.hero_media_type === 'video' && (
              <div className="space-y-4 border-t border-line pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                      Upload Video File (MP4)
                    </label>
                    <input
                      type="file"
                      accept="video/mp4,video/*"
                      onChange={(e) => setHeroVideoFile(e.target.files[0] || null)}
                      className="mt-1 block w-full text-xs text-ink file:mr-2 file:rounded-control file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-ink-soft"
                    />
                    <p className="mt-1 text-[0.7rem] text-muted">Portrait MP4 (recommended under 5 MB, 5-15 seconds)</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                      Or Video URL / Static Path
                    </label>
                    <input
                      type="text"
                      value={configForm.hero_video_url}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, hero_video_url: e.target.value })
                      }
                      placeholder="/videos/brand-intro.mp4"
                      className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-48">
                    <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                      Loop End (Seconds)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={configForm.hero_video_loop_end}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          hero_video_loop_end: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  {(heroVideoFile || heroPreviewSrc(configForm)) && (
                    <div className="mt-4 space-y-2 text-xs text-muted">
                      <p>
                        Current source:{' '}
                        <span className="font-mono text-ink">
                          {heroVideoFile ? heroVideoFile.name : heroPreviewSrc(configForm)}
                        </span>
                      </p>
                      {!heroVideoFile && heroPreviewSrc(configForm) && (
                        <video
                          key={heroPreviewSrc(configForm)}
                          src={heroPreviewSrc(configForm)}
                          muted
                          playsInline
                          controls
                          preload="metadata"
                          className="max-h-40 rounded-control border border-line bg-ink"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSavingConfig}>
              {isSavingConfig ? 'Saving...' : 'Save Hero Changes'}
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: WATCH & SHOP REELS */}
      {activeTab === 'reels' && (
        <div data-manage-section="reels" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-ink">Watch &amp; Shop Video Reels</h2>
              <p className="text-xs text-muted">
                Interactive video clips shown on the homepage. Customers can tap any reel to shop the products.
              </p>
            </div>
            <Button type="button" onClick={handleOpenAddReel}>
              + Add Video Reel
            </Button>
          </div>

          {isReelsLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[9/16] rounded-card" />
              ))}
            </div>
          ) : !reelsData || reelsData.length === 0 ? (
            <EmptyState
              title="No video reels yet"
              message="Add your first short video reel to show on the homepage watch & shop strip."
              action={
                <Button type="button" onClick={handleOpenAddReel}>
                  Add video reel
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {reelsData.map((reel, index) => (
                <div
                  key={reel.id}
                  className={`group relative flex flex-col overflow-hidden rounded-card border bg-surface shadow-card transition-all ${
                    reel.is_active ? 'border-line' : 'border-line opacity-60'
                  }`}
                >
                  <div className="relative aspect-[9/16] w-full overflow-hidden bg-ink">
                    {reelPreviewSrc(reel) ? (
                      <video
                        key={reelPreviewSrc(reel)}
                        src={reelPreviewSrc(reel)}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-3 text-center text-xs text-white/60">
                        No video yet — edit to add a file or URL
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/90 to-transparent p-2 text-white">
                      <p className="line-clamp-2 text-xs font-bold leading-tight">{reel.title}</p>
                      <p className="mt-0.5 text-[0.65rem] text-accent truncate">{reel.link_url}</p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-col gap-1 p-2 bg-canvas border-t border-line">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[0.65rem] font-bold text-muted">#{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleReelActive(reel)}
                        className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                          reel.is_active ? 'bg-success-soft text-success' : 'bg-subtle text-muted'
                        }`}
                      >
                        {reel.is_active ? 'Active' : 'Hidden'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveReel(index, -1)}
                          className="h-7 w-7 rounded-control border border-line bg-surface text-xs font-bold disabled:opacity-30 hover:bg-subtle"
                          title="Move left"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={index === reelsData.length - 1}
                          onClick={() => handleMoveReel(index, 1)}
                          className="h-7 w-7 rounded-control border border-line bg-surface text-xs font-bold disabled:opacity-30 hover:bg-subtle"
                          title="Move right"
                        >
                          →
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditReel(reel)}
                          aria-label="Edit reel"
                          title="Edit"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-btn border border-line bg-surface text-ink hover:bg-subtle"
                        >
                          <FaIcon icon="pen" className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingReel(reel)}
                          aria-label="Delete reel"
                          title="Delete reel"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-btn border border-line bg-surface text-danger hover:bg-danger-soft"
                        >
                          <FaIcon icon="trash" className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SECTION ORDERING & VISIBILITY */}
      {activeTab === 'sections' && configForm && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div
            data-manage-section="sections"
            className="rounded-card border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-card"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-ink">Homepage Sections Hierarchy</h2>
                <p className="text-xs text-muted">
                  Drag or use the arrows to reorder sections. Toggle any section on/off.
                </p>
              </div>
              <Button type="submit" disabled={isSavingConfig}>
                {isSavingConfig ? 'Saving...' : 'Save Section Order'}
              </Button>
            </div>

            <ul className="divide-y divide-line rounded-card border border-line bg-canvas">
              {configForm.sections_order.map((sec, index) => (
                <li
                  key={sec.id}
                  className={`flex items-center justify-between gap-3 p-3 sm:px-4 ${
                    !sec.enabled ? 'bg-subtle/50 text-muted' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-subtle text-xs font-bold text-ink">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{sec.name}</p>
                      <p className="text-[0.7rem] font-mono text-muted">id: {sec.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={() => handleToggleSection(sec.id)}
                        className="h-4 w-4 rounded text-accent focus:ring-accent"
                      />
                      <span className="text-xs font-semibold text-ink">
                        {sec.enabled ? 'Visible' : 'Hidden'}
                      </span>
                    </label>

                    {/* Move Controls */}
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveSection(index, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-xs font-bold disabled:opacity-30 hover:bg-subtle"
                        title="Move Up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === configForm.sections_order.length - 1}
                        onClick={() => handleMoveSection(index, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-xs font-bold disabled:opacity-30 hover:bg-subtle"
                        title="Move Down"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </form>
      )}

      {/* TAB 4: TICKER & TRUST BADGES */}
      {activeTab === 'content' && configForm && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* Marquee Ticker */}
          <div
            data-manage-section="marquee"
            className="rounded-card border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-card"
          >
            <div>
              <h2 className="text-base font-bold text-ink">Marquee Ticker Tape</h2>
              <p className="text-xs text-muted">Scrolling highlight items below the hero banner.</p>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {configForm.marquee_items.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-control border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMarqueeItem(idx)}
                      className="text-muted hover:text-danger focus:outline-none"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newMarqueeItem}
                  onChange={(e) => setNewMarqueeItem(e.target.value)}
                  placeholder="Add marquee highlight phrase (e.g. Free shipping on orders over ₹499)..."
                  className="flex-1 rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
                <Button type="button" variant="outline" onClick={handleAddMarqueeItem}>
                  Add phrase
                </Button>
              </div>
            </div>
          </div>

          {/* Skin Quiz Promo Banner */}
          <div
            data-manage-section="quiz"
            className="rounded-card border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink">Skin Quiz Promo Banner</h2>
                <p className="text-xs text-muted">Promo card inviting visitors to take the skin routine quiz.</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configForm.quiz_enabled}
                  onChange={(e) => setConfigForm({ ...configForm, quiz_enabled: e.target.checked })}
                  className="h-4 w-4 rounded text-accent focus:ring-accent"
                />
                <span className="text-xs font-semibold text-ink">Active</span>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={configForm.quiz_badge}
                  onChange={(e) => setConfigForm({ ...configForm, quiz_badge: e.target.value })}
                  placeholder="2-minute routine builder"
                  className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                  Heading
                </label>
                <input
                  type="text"
                  value={configForm.quiz_title}
                  onChange={(e) => setConfigForm({ ...configForm, quiz_title: e.target.value })}
                  placeholder="Find the right routine for your skin"
                  className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={configForm.quiz_subtitle}
                  onChange={(e) => setConfigForm({ ...configForm, quiz_subtitle: e.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                  Button Text
                </label>
                <input
                  type="text"
                  value={configForm.quiz_button_text}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, quiz_button_text: e.target.value })
                  }
                  placeholder="Take the skin quiz"
                  className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                  Button Link
                </label>
                <input
                  type="text"
                  value={configForm.quiz_link}
                  onChange={(e) => setConfigForm({ ...configForm, quiz_link: e.target.value })}
                  placeholder="/skin-quiz"
                  className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Shop by budget tiles */}
          <div
            data-manage-section="budget"
            className="rounded-card border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-ink">Shop by budget tiles</h2>
                <p className="text-xs text-muted">
                  Homepage price shortcuts. Use shop links like{' '}
                  <code className="text-ink">/shop?max_price=499</code> or{' '}
                  <code className="text-ink">/shop?min_price=1000</code>.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={handleAddBudgetTile}>
                + Add tile
              </Button>
            </div>

            <div className="space-y-3">
              {(configForm.budget_tiles || []).map((tile, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded-card border border-line bg-canvas p-3 sm:grid-cols-[minmax(0,7rem)_minmax(0,8rem)_minmax(0,1fr)_auto] sm:items-end"
                >
                  <div>
                    <label className="block text-[0.65rem] font-semibold text-muted uppercase">
                      Label
                    </label>
                    <input
                      type="text"
                      value={tile.label}
                      onChange={(e) => handleBudgetTileChange(idx, 'label', e.target.value)}
                      placeholder="Under"
                      className="mt-1 w-full rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.65rem] font-semibold text-muted uppercase">
                      Amount
                    </label>
                    <input
                      type="text"
                      value={tile.amount}
                      onChange={(e) => handleBudgetTileChange(idx, 'amount', e.target.value)}
                      placeholder="₹499"
                      className="mt-1 w-full rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.65rem] font-semibold text-muted uppercase">
                      Shop link
                    </label>
                    <input
                      type="text"
                      value={tile.to}
                      onChange={(e) => handleBudgetTileChange(idx, 'to', e.target.value)}
                      placeholder="/shop?max_price=499"
                      className="mt-1 w-full rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBudgetTile(idx)}
                    className="h-8 w-8 justify-self-end rounded-control text-xs text-danger hover:bg-danger-soft sm:mb-0.5"
                    title="Remove tile"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {(configForm.budget_tiles || []).length === 0 ? (
                <p className="text-sm text-muted">No tiles yet. Add one or leave empty to hide the section on the shop.</p>
              ) : null}
            </div>
          </div>

          {/* Benefits / Trust Badges */}
          <div
            data-manage-section="benefits"
            className="rounded-card border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink">Store Benefits / Trust Badges</h2>
                <p className="text-xs text-muted">Value proposition cards near the bottom of the homepage.</p>
              </div>
              <Button type="button" variant="outline" onClick={handleAddBenefit}>
                + Add Benefit
              </Button>
            </div>

            <div className="space-y-3">
              {configForm.benefits.map((benefit, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 rounded-card border border-line bg-canvas p-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="w-full sm:w-1/3">
                    <label className="block text-[0.65rem] font-semibold text-muted uppercase">
                      Title
                    </label>
                    <input
                      type="text"
                      value={benefit.title}
                      onChange={(e) => handleBenefitChange(idx, 'title', e.target.value)}
                      placeholder="e.g. Cash on delivery"
                      className="mt-1 w-full rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div className="w-full sm:flex-1">
                    <label className="block text-[0.65rem] font-semibold text-muted uppercase">
                      Text
                    </label>
                    <input
                      type="text"
                      value={benefit.text}
                      onChange={(e) => handleBenefitChange(idx, 'text', e.target.value)}
                      placeholder="e.g. Pay when your order arrives."
                      className="mt-1 w-full rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBenefit(idx)}
                    className="self-end sm:self-center mt-2 sm:mt-4 h-7 w-7 rounded-control text-xs text-danger hover:bg-danger-soft"
                    title="Remove benefit"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSavingConfig}>
              {isSavingConfig ? 'Saving...' : 'Save ticker, budget & badges'}
            </Button>
          </div>
        </form>
      )}

      {/* Reel Add/Edit Modal */}
      <Modal
        isOpen={reelModalOpen}
        onClose={() => setReelModalOpen(false)}
        title={editingReelId ? 'Edit Video Reel' : 'Add New Video Reel'}
      >
        <form onSubmit={handleSaveReel} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
              Reel Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={reelForm.title}
              onChange={(e) => setReelForm({ ...reelForm, title: e.target.value })}
              placeholder="e.g. The glow serum drop"
              className="mt-1 w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
              Upload MP4 Video
            </label>
            <input
              type="file"
              accept="video/mp4,video/*"
              onChange={(e) => setReelForm({ ...reelForm, video_file: e.target.files[0] || null })}
              className="w-full text-xs text-ink file:mr-2 file:rounded-control file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-ink-soft"
            />
            <p className="text-[0.7rem] text-muted">9:16 portrait video under 5 MB.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
              Or Video URL / Path
            </label>
            <input
              type="text"
              value={reelForm.video_url}
              onChange={(e) => setReelForm({ ...reelForm, video_url: e.target.value })}
              placeholder="/videos/serum.mp4"
              className="mt-1 w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
              Target Shop Link <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={reelForm.link_url}
              onChange={(e) => setReelForm({ ...reelForm, link_url: e.target.value })}
              placeholder="/shop?category=skincare or /products/slug"
              className="mt-1 w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                Start Time (s)
              </label>
              <input
                type="number"
                step="0.5"
                value={reelForm.start_seconds}
                onChange={(e) =>
                  setReelForm({ ...reelForm, start_seconds: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-ink uppercase">
                Loop End (s)
              </label>
              <input
                type="number"
                step="0.5"
                value={reelForm.loop_end_seconds}
                onChange={(e) =>
                  setReelForm({ ...reelForm, loop_end_seconds: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="reel-is-active"
              checked={reelForm.is_active}
              onChange={(e) => setReelForm({ ...reelForm, is_active: e.target.checked })}
              className="h-4 w-4 rounded text-accent focus:ring-accent"
            />
            <label htmlFor="reel-is-active" className="text-xs font-semibold text-ink cursor-pointer">
              Show this reel live on the storefront
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="outline" onClick={() => setReelModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSavingReel}>
              {isSavingReel ? 'Saving...' : 'Save Reel'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Reel Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingReel)}
        onClose={() => setDeletingReel(null)}
        onConfirm={handleDeleteReel}
        isLoading={isDeletingReel}
        title="Delete video reel?"
        message={`Are you sure you want to delete "${deletingReel?.title}"? This video clip will no longer appear on the home page.`}
        confirmLabel="Delete reel"
        variant="danger"
      />
    </div>
  )
}
