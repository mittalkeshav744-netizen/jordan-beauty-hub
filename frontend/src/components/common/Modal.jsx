import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const SIZE_CLASSES = {
  default: 'w-[min(100%,28rem)] max-h-[min(88dvh,36rem)]',
  wide: 'h-[min(90dvh,48rem)] w-[min(100%,56rem)]',
  xl: 'h-[min(92dvh,54rem)] w-[min(100%,72rem)]',
}

/**
 * Stable modal overlay (not native <dialog>).
 * Fixed flex centering + locked panel height keeps the popup from jumping when
 * fields focus, validate, or grow. Escape/body-lock use a ref so parent re-renders
 * (inline onClose) never re-focus the Close button mid-typing.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'default',
  contentClassName = '',
  hideCloseButton = false,
}) {
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const isWide = size === 'wide' || size === 'xl'

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    // Scrollbars are hidden globally; do not pad the body (that shifts the page).
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = ''

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    const focusable = panelRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    // Prefer the first field over the header Close button so typing starts immediately.
    const preferred =
      panelRef.current?.querySelector(
        'input:not([type="hidden"]):not([type="file"]), select, textarea',
      ) || focusable
    if (preferred && typeof preferred.focus === 'function') {
      try {
        preferred.focus({ preventScroll: true })
      } catch {
        preferred.focus()
      }
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [isOpen])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="jbh-modal-root fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5"
      style={{ contain: 'layout paint' }}
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink/50"
        onClick={() => onCloseRef.current()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
        className={`relative z-[1] flex max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-card border border-line bg-surface text-ink shadow-raised ${
          SIZE_CLASSES[size] || SIZE_CLASSES.default
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-lg font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 truncate text-xs text-muted sm:text-sm">{description}</p>
            ) : null}
          </div>
          {!hideCloseButton ? (
            <button
              type="button"
              onClick={() => onCloseRef.current()}
              aria-label="Close"
              title="Close"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-btn text-danger transition-colors hover:bg-danger-soft"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ) : null}
        </div>

        <div
          className={
            contentClassName ||
            (isWide
              ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 text-sm text-ink sm:px-5'
              : 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 text-sm text-ink-soft sm:px-5')
          }
        >
          {children}
        </div>

        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-line px-4 py-3 sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
