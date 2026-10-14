import { useEffect, useId, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'

const SIDE_CLASSES = {
  left: 'left-0',
  right: 'right-0',
}

/**
 * Slide-in panel with a dimmed backdrop. Closes on Escape or backdrop click,
 * locks page scrolling while open and returns focus to the opener on close.
 * `className` is applied to the wrapper (e.g. "lg:hidden" for mobile-only drawers).
 */
export default function Drawer({ isOpen, onClose, title, side = 'left', id, className = '', footer, children }) {
  const panelRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return undefined
    const opener = document.activeElement
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-40 ${className}`}>
      <button type="button" aria-label="Close panel" tabIndex={-1} className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute inset-y-0 ${SIDE_CLASSES[side]} flex w-[min(88vw,22rem)] flex-col bg-surface shadow-raised focus:outline-none`}
      >
        <div className="flex items-center justify-between border-b border-line py-2 pr-2 pl-5">
          <h2 id={titleId} className="text-sm font-bold tracking-widest uppercase">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-control text-2xl leading-none hover:bg-subtle"
            aria-label={`Close ${title.toLowerCase()}`}
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
        {footer && <div className="border-t border-line p-4">{footer}</div>}
      </div>
    </div>
  )
}
