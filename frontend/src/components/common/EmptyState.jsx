export default function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-cream px-6 py-14 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {message && <p className="max-w-md text-sm text-muted">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
