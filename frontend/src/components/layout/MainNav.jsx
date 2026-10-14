import { Link, useLocation } from 'react-router'

import { MAIN_NAV_LINKS } from '../../constants/navigation'
import { isNavLinkActive } from '../../utils/navigation'

export default function MainNav() {
  const location = useLocation()

  return (
    <nav aria-label="Main" className="hidden border-t border-line lg:block">
      <ul className="page-container flex items-center justify-center gap-8">
        {MAIN_NAV_LINKS.map((link) => {
          const isActive = isNavLinkActive(link.to, location)
          return (
            <li key={link.to}>
              <Link
                to={link.to}
                aria-current={isActive ? 'page' : undefined}
                className={`block border-b-2 py-3 text-xs font-semibold tracking-widest uppercase transition-colors ${
                  isActive ? 'border-accent text-accent' : 'border-transparent hover:text-accent'
                }`}
              >
                {link.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
