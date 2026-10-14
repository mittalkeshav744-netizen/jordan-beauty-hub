const STATUS_CLASSES = {
  pending: 'bg-warning-soft text-warning',
  confirmed: 'bg-accent-soft text-accent',
  processing: 'bg-accent-soft text-accent',
  shipped: 'bg-cream text-ink',
  delivered: 'bg-success-soft text-success',
  cancelled: 'bg-subtle text-muted',
}

export default function StatusBadge({ status, label }) {
  return (
    <span
      className={`inline-block rounded-control px-2 py-1 text-[0.7rem] font-semibold tracking-wide uppercase ${
        STATUS_CLASSES[status] ?? 'bg-subtle text-ink'
      }`}
    >
      {label ?? status}
    </span>
  )
}
