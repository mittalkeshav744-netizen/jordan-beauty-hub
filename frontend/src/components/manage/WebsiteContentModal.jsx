import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'

import FaIcon from './FaIcon'

function isManagePath(path) {
  return typeof path === 'string' && (path === '/manage' || path.startsWith('/manage/') || path.startsWith('/manage?'))
}

/**
 * Full-bleed storefront preview with hover-to-edit hotspots (iframe ?ownerMap=1).
 * Uses the same fixed overlay pattern as Modal (no native <dialog> jump).
 */
export default function WebsiteContentModal({ isOpen, onClose }) {
  const titleId = useId()
  const navigate = useNavigate()
  const onCloseRef = useRef(onClose)
  const navigateRef = useRef(navigate)
  const [frameSrc, setFrameSrc] = useState('')
  const [frameStatus, setFrameStatus] = useState('idle')

  useEffect(() => {
    onCloseRef.current = onClose
    navigateRef.current = navigate
  }, [onClose, navigate])

  useEffect(() => {
    if (!isOpen) {
      setFrameSrc('')
      setFrameStatus('idle')
      return undefined
    }
    setFrameSrc(`/?ownerMap=1&_=${Date.now()}`)
    setFrameStatus('loading')

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
    }
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return
      const data = event.data
      if (!data || data.type !== 'owner-map-navigate') return
      const path = typeof data.path === 'string' ? data.path : ''
      if (!isManagePath(path)) return
      onCloseRef.current()
      navigateRef.current(path)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('message', onMessage)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('message', onMessage)
    }
  }, [isOpen])

  const handleFrameLoad = (event) => {
    const frame = event.currentTarget
    window.setTimeout(() => {
      try {
        const root = frame.contentDocument?.getElementById('root')
        const mounted = Boolean(root && root.childElementCount > 0)
        setFrameStatus(mounted ? 'ready' : 'error')
      } catch {
        setFrameStatus('ready')
      }
    }, 1200)
  }

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="jbh-modal-root fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-ink/55" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] flex h-[min(96dvh,58rem)] w-[min(98vw,90rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-card border border-line bg-surface text-ink shadow-raised"
      >
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-base font-semibold sm:text-lg">
              Website content
            </h2>
            <p className="text-xs text-muted sm:text-sm">Hover a section, then click to open its manage screen.</p>
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close"
            title="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-btn text-danger transition-colors hover:bg-danger-soft"
          >
            <FaIcon icon="xmark" className="h-4 w-4" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 bg-subtle">
          {frameStatus === 'loading' && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-canvas/80 text-sm text-muted">
              Loading shop preview…
            </div>
          )}
          {frameStatus === 'error' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
              <p className="max-w-md text-sm text-ink-soft">
                Shop preview failed to load (usually a stale browser cache after a rebuild).
              </p>
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-btn bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-soft"
                onClick={() => {
                  setFrameStatus('loading')
                  setFrameSrc(`/?ownerMap=1&_=${Date.now()}`)
                }}
              >
                Retry preview
              </button>
            </div>
          )}
          {frameSrc ? (
            <iframe
              key={frameSrc}
              title="Shop preview — editable regions"
              src={frameSrc}
              onLoad={handleFrameLoad}
              className="block h-full min-h-[min(70dvh,36rem)] w-full border-0 bg-canvas"
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
