import { Link } from 'react-router'

/** items: [{ label, to }] — the last item is the current page and is not a link. */
export default function Breadcrumbs({ items, className = '', tone = 'default' }) {
  const muted = tone === 'onDark' ? 'text-white/55' : 'text-muted'
  const current = tone === 'onDark' ? 'text-white' : 'text-ink'
  const link = tone === 'onDark' ? 'text-white/75 hover:text-white' : 'hover:text-accent'

  return (
    <nav aria-label="Breadcrumb" className={`py-4 text-xs ${muted} ${className}`.trim()}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={item.label} className="flex min-w-0 items-center gap-1">
              {isLast || !item.to ? (
                <span aria-current={isLast ? 'page' : undefined} className={`line-clamp-1 ${current}`}>
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className={link}>
                  {item.label}
                </Link>
              )}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
