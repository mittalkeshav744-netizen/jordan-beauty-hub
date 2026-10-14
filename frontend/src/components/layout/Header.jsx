import { useCallback, useState } from 'react'
import { Link } from 'react-router'

import { useAuth } from '../../hooks/useAuth'
import { useCart } from '../../hooks/useCart'
import AnnouncementBar from './AnnouncementBar'
import Logo from './Logo'
import MainNav from './MainNav'
import MobileNav from './MobileNav'
import SearchBar from './SearchBar'

const ICON_BUTTON_CLASSES = 'relative h-11 w-11 shrink-0 items-center justify-center rounded-control hover:bg-subtle'

function Icon({ children, strokeWidth = 1.8 }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      {children}
    </svg>
  )
}

function IconLink({ to, label, badge, className = 'flex', children }) {
  return (
    <Link
      to={to}
      aria-label={badge ? `${label} (${badge} items)` : label}
      className={`${ICON_BUTTON_CLASSES} ${className}`}
    >
      <Icon>{children}</Icon>
      {badge > 0 && (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.6rem] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  )
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const closeMenu = useCallback(() => setIsMenuOpen(false), [])
  const closeSearch = useCallback(() => setIsSearchOpen(false), [])
  const { isAuthenticated, user } = useAuth()
  const { cart } = useCart()

  return (
    <>
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur">
        <AnnouncementBar />
        <div className="page-container flex h-16 items-center gap-1 sm:gap-4">
          <button
            type="button"
            className={`${ICON_BUTTON_CLASSES} -ml-2 flex lg:hidden`}
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen(true)}
          >
            <Icon strokeWidth={2}>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </Icon>
          </button>

          <Link to="/" className="min-w-0 rounded-control md:shrink-0">
            <Logo />
          </Link>

          <SearchBar className="mx-auto hidden w-full max-w-md min-w-0 md:block" />

          <div className="-mr-2 ml-auto flex shrink-0 items-center md:ml-0">
            {isAuthenticated && (
              <span className="mr-2 hidden text-xs text-muted xl:inline">Hi, {user.first_name}</span>
            )}
            <button
              type="button"
              className={`${ICON_BUTTON_CLASSES} flex md:hidden`}
              aria-label={isSearchOpen ? 'Close search' : 'Search'}
              aria-expanded={isSearchOpen}
              aria-controls="mobile-search"
              onClick={() => setIsSearchOpen((open) => !open)}
            >
              <Icon strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </Icon>
            </button>
            {/* Below 400px the account link lives in the menu drawer so the full logo fits. */}
            <IconLink
              to={isAuthenticated ? '/account' : '/login'}
              label={isAuthenticated ? 'My account' : 'Sign in'}
              className="hidden min-[400px]:flex"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </IconLink>
            <IconLink to="/cart" label="Bag" badge={cart.item_count}>
              <path d="M5 8h14l-1 12H6L5 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </IconLink>
          </div>
        </div>
        {isSearchOpen && (
          <div id="mobile-search" className="page-container pb-3 md:hidden">
            <SearchBar autoFocus onSearch={closeSearch} />
          </div>
        )}
        <MainNav />
        <div className="border-b border-line" />
      </header>
      {/* Kept outside <header>: its backdrop-filter would confine the fixed overlay to the header. */}
      <MobileNav isOpen={isMenuOpen} onClose={closeMenu} />
    </>
  )
}
