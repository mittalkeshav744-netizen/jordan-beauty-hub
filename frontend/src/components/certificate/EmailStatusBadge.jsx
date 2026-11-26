const LABELS = {
  sent: 'Sent',
  failed: 'Failed',
  pending: 'Pending',
  sending: 'Sending',
  none: 'None',
}

export default function EmailStatusBadge({ status }) {
  const key = String(status || 'none').toLowerCase()
  return <span className={`cert-badge cert-badge--${key}`}>{LABELS[key] || key}</span>
}
