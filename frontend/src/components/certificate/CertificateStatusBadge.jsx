const LABELS = {
  draft: 'Draft',
  issued: 'Issued',
  revoked: 'Revoked',
  reissued: 'Reissued',
}

export default function CertificateStatusBadge({ status }) {
  const key = String(status || 'draft').toLowerCase()
  return <span className={`cert-badge cert-badge--${key}`}>{LABELS[key] || key}</span>
}
