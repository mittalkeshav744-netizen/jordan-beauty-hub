import FaIcon from './FaIcon'

/**
 * Standard Owner Studio content panel (card surface).
 * Presentational only — no data fetching.
 */
export default function ManagePanel({
  title,
  description,
  icon,
  actions,
  children,
  className = '',
  bodyClassName = '',
  as: Tag = 'section',
  ...props
}) {
  return (
    <Tag className={`manage-panel overflow-hidden ${className}`} {...props}>
      {title || actions || description ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title ? (
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                {icon ? <FaIcon icon={icon} className="h-3.5 w-3.5 shrink-0 text-berry" /> : null}
                <span>{title}</span>
              </h2>
            ) : null}
            {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName || undefined}>{children}</div>
    </Tag>
  )
}
