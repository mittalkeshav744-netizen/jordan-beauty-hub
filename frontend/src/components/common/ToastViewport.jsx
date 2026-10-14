const VARIANT_CLASSES = {
  success: 'border-success/30 bg-success-soft text-success',
  error: 'border-danger/30 bg-danger-soft text-danger',
  info: 'border-line bg-surface text-ink',
}

export default function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.variant === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex w-full max-w-sm items-start justify-between gap-3 rounded-card border p-4 text-sm font-medium shadow-raised ${VARIANT_CLASSES[toast.variant] ?? VARIANT_CLASSES.info}`}
        >
          <span className="min-w-0 self-center">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="-my-3 -mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-lg opacity-70 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
