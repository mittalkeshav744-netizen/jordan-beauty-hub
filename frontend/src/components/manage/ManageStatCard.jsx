import { Link } from 'react-router'

import FaIcon from './FaIcon'

/**
 * Compact KPI tile for Owner Studio dashboards and summaries.
 * Uses real values passed by the parent — never invents metrics.
 */
export default function ManageStatCard({
  label,
  value,
  hint,
  to,
  featured = false,
  icon,
  className = '',
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-[0.65rem] font-semibold tracking-[0.14em] uppercase ${
            featured ? 'text-white/80' : 'text-muted'
          }`}
        >
          {label}
        </p>
        {icon ? (
          <span className={featured ? 'text-white/70' : 'text-accent'}>
            <FaIcon icon={icon} className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <p className={`mt-2 font-display text-2xl font-semibold tracking-tight ${featured ? 'text-white' : 'text-ink'}`}>
        {value}
      </p>
      {hint ? (
        <p className={`mt-1 text-xs ${featured ? 'text-white/75' : 'text-muted'}`}>{hint}</p>
      ) : null}
    </>
  )

  const classNames = `${featured ? 'manage-kpi-featured' : 'manage-kpi'} block ${className}`

  if (to) {
    return (
      <Link to={to} className={classNames}>
        {body}
      </Link>
    )
  }

  return <div className={classNames}>{body}</div>
}
