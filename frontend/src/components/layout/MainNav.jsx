import { Link, useLocation } from 'react-router'

import { useNavCategories } from '../../hooks/useNavCategories'
import { isNavLinkActive } from '../../utils/navigation'
import NewBadge from '../common/NewBadge'

export default function MainNav() {
  const location = useLocation()
  const { links } = useNavCategories()

  return (
    <nav aria-label="Main" className="hidden border-t border-line lg:block">
      <ul className="page-container flex flex-wrap items-center justify-center gap-x-5 gap-y-0 xl:gap-x-7">
        {links.map((link) => {
          const isActive = isNavLinkActive(link.to, location)
          return (
            <li key={link.to}>
              <Link
                to={link.to}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold tracking-widest uppercase transition-colors ${
                  isActive ? 'border-accent text-accent' : 'border-transparent hover:text-accent'
                } ${link.highlight ? 'text-accent' : ''}`}
              >
                {link.label}
                {link.highlight && <NewBadge />}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
