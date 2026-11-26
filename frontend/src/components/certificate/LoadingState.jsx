export default function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="cert-card animate-pulse space-y-3 p-5" role="status" aria-live="polite">
      <div className="h-4 w-1/3 rounded bg-[var(--cert-line)]" />
      <div className="h-24 rounded bg-[var(--cert-line)]" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
