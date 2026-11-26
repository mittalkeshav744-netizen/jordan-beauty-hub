import Modal from '../common/Modal'

export default function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="cert-btn-outline" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'cert-btn-danger' : 'cert-btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-[var(--cert-muted)]">{message}</p>
    </Modal>
  )
}
