import { useEffect, useId, useRef } from 'react'

/**
 * Accessible modal built on the native <dialog> element, which provides
 * focus trapping and Escape-to-close for free.
 */
export default function Modal({ isOpen, onClose, title, children, footer }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal?.()
    if (!isOpen && dialog.open) dialog.close?.()
  }, [isOpen])

  const handleBackdropClick = (event) => {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="m-auto max-h-[90dvh] w-[min(92vw,28rem)] overflow-y-auto overscroll-contain rounded-card bg-surface p-0 text-ink shadow-raised backdrop:bg-ink/50"
    >
      {isOpen && (
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <div className="text-sm text-ink-soft">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-3">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
