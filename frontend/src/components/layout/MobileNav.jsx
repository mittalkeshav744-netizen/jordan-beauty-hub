import { Link, useLocation } from 'react-router'

import { useAuth } from '../../hooks/useAuth'
import { useNavCategories } from '../../hooks/useNavCategories'
import { isNavLinkActive } from '../../utils/navigation'
import Drawer from '../common/Drawer'
import NewBadge from '../common/NewBadge'
import SearchBar from './SearchBar'

export default function MobileNav({ isOpen, onClose }) {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { links } = useNavCategories()

  const linkClasses =
    'flex min-h-11 items-center border-b border-line text-sm font-semibold tracking-wide uppercase'

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Menu" id="mobile-navigation" className="lg:hidden">
      <nav aria-label="Mobile" className="flex flex-col gap-3">
        <SearchBar id="mobile-site-search" onSearch={onClose} />
        <ul>
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                onClick={onClose}
                aria-current={isNavLinkActive(link.to, location) ? 'page' : undefined}
                className={`${linkClasses} gap-2 ${isNavLinkActive(link.to, location) || link.highlight ? 'text-accent' : ''}`}
              >
                {link.label}
                {link.highlight && <NewBadge />}
              </Link>
            </li>
          ))}
          <li>
            <Link to={isAuthenticated ? '/account' : '/login'} onClick={onClose} className={linkClasses}>
              {isAuthenticated ? 'My account' : 'Sign in'}
            </Link>
          </li>
          <li>
            <Link to="/account/wishlist" onClick={onClose} className={linkClasses}>
              Wishlist
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
