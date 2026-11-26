import FaIcon from '../manage/FaIcon'

const TONE_CLASSES = {
  default: 'bg-[var(--cert-gold-soft)] text-[var(--cert-navy)]',
  gold: 'bg-[var(--cert-gold-soft)] text-[var(--cert-navy)]',
  success: 'bg-[#e7f5ee] text-[var(--cert-success)]',
  danger: 'bg-[#fdecea] text-[var(--cert-danger)]',
}

export default function StatCard({ label, value, hint, icon, tone = 'default' }) {
  return (
    <article className="cert-card flex items-start justify-between gap-3 p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-[var(--cert-muted)] uppercase">{label}</p>
        <p className="mt-2 font-[family-name:var(--font-cert-display)] text-3xl leading-none font-bold text-[var(--cert-navy)]">
          {value ?? '—'}
        </p>
        {hint ? <p className="mt-2 text-xs text-[var(--cert-muted)]">{hint}</p> : null}
      </div>
      {icon ? (
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.625rem] ${
            TONE_CLASSES[tone] || TONE_CLASSES.default
          }`}
        >
          <FaIcon icon={icon} className="h-4 w-4" />
        </span>
      ) : null}
    </article>
  )
}
