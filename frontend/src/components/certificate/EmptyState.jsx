import FaIcon from '../manage/FaIcon'

export default function EmptyState({ title, message, icon, action }) {
  return (
    <div className="cert-card flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? (
        <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--cert-gold-soft)] text-[var(--cert-navy)]">
          <FaIcon icon={icon} className="h-5 w-5" />
        </span>
      ) : null}
      <h3 className="font-[family-name:var(--font-cert-display)] text-lg font-semibold text-[var(--cert-navy)]">
        {title}
      </h3>
      {message ? <p className="mt-2 max-w-md text-sm text-[var(--cert-muted)]">{message}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
