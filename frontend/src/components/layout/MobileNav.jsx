import { Link, useLocation } from 'react-router'

import { MAIN_NAV_LINKS } from '../../constants/navigation'
import { useAuth } from '../../hooks/useAuth'
import { isNavLinkActive } from '../../utils/navigation'
import Drawer from '../common/Drawer'
import SearchBar from './SearchBar'

export default function MobileNav({ isOpen, onClose }) {
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const linkClasses = 'flex min-h-12 items-center border-b border-line text-sm font-semibold tracking-wide uppercase'

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Menu" id="mobile-navigation" className="lg:hidden">
      <nav aria-label="Mobile" className="flex flex-col gap-4">
        <SearchBar id="mobile-site-search" onSearch={onClose} />
        <ul>
          {MAIN_NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                onClick={onClose}
                aria-current={isNavLinkActive(link.to, location) ? 'page' : undefined}
                className={`${linkClasses} ${isNavLinkActive(link.to, location) ? 'text-accent' : ''}`}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link to={isAuthenticated ? '/account' : '/login'} onClick={onClose} className={linkClasses}>
              {isAuthenticated ? 'My account' : 'Sign in'}
            </Link>
          </li>
          <li>
            <Link to="/cart" onClick={onClose} className={linkClasses}>
              Bag
            </Link>
          </li>
        </ul>
      </nav>
    </Drawer>
  )
}
