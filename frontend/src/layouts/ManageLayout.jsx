import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { PageLoader } from '../components/common/Spinner'
import FaIcon from '../components/manage/FaIcon'
import WebsiteContentModal from '../components/manage/WebsiteContentModal'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { portalService } from '../services/portalService'

/** Logical groups for the rail only — routes and labels are unchanged. */
const NAV_GROUPS = [
  {
    id: 'ops',
    label: 'Operations',
    items: [
      { to: '/manage', label: 'Home', end: true, title: 'Home', icon: 'home' },
      { to: '/manage/orders', label: 'Orders', badgeKey: 'pending_orders', title: 'Orders', icon: 'orders' },
      { to: '/manage/customers', label: 'Customers', title: 'Customers', icon: 'customers' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalogue',
    items: [
      { to: '/manage/products', label: 'Products', badgeKey: 'low_stock_variants', title: 'Products', icon: 'products' },
      { to: '/manage/categories', label: 'Categories', title: 'Categories', icon: 'categories' },
      { to: '/manage/looks', label: 'Looks', title: 'Looks', icon: 'looks' },
      { to: '/manage/courses', label: 'Courses', title: 'Courses', icon: 'courses' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { to: '/manage/storefront', label: 'Storefront', title: 'Storefront', icon: 'storefront' },
      { to: '/manage/reviews', label: 'Reviews', badgeKey: 'pending_reviews', title: 'Reviews', icon: 'reviews' },
      { to: '/manage/newsletter', label: 'Newsletter', title: 'Newsletter', icon: 'mail' },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    items: [
      { to: '/manage/coupons', label: 'Coupons', title: 'Coupons', icon: 'coupons' },
      { to: '/manage/settings', label: 'Settings', title: 'Settings', icon: 'settings' },
    ],
  },
]

const NAV = NAV_GROUPS.flatMap((group) => group.items)

const SIDEBAR_KEY = 'jbh-manage-sidebar-collapsed'

function pageTitle(pathname) {
  const match = NAV.find((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  )
  if (pathname.includes('/orders/') && pathname !== '/manage/orders') return 'Order'
  if (pathname.includes('/products/') && pathname !== '/manage/products') return 'Product'
  if (pathname.includes('/customers/') && pathname !== '/manage/customers') return 'Customer'
  return match?.title || 'Owner ops'
}

function readCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

function navClass(collapsed) {
  return ({ isActive }) =>
    [
      'group relative flex min-h-10 items-center transition-[background-color,box-shadow,color,padding] duration-200 ease-[var(--ease-standard)]',
      collapsed ? 'justify-center rounded-card px-0' : 'justify-between gap-2 rounded-control px-3',
      isActive
        ? collapsed
          ? 'bg-berry text-white shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-berry)_50%,transparent),0_0_16px_color-mix(in_srgb,var(--color-accent)_35%,transparent)]'
          : 'bg-berry font-semibold text-white shadow-[0_0_14px_color-mix(in_srgb,var(--color-berry)_30%,transparent)]'
        : 'text-white/70 hover:bg-white/10 hover:text-white',
    ].join(' ')
}

function mobileNavClass({ isActive }) {
  return [
    'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-btn transition-colors',
    isActive ? 'bg-berry text-white shadow-studio' : 'text-ink-soft hover:bg-cream hover:text-ink',
  ].join(' ')
}

function Badge({ count, active, collapsed, tone = 'light' }) {
  if (!count) return null
  if (collapsed) {
    return (
      <span
        className={`absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-bold ring-2 ${
          tone === 'dark'
            ? 'bg-accent-soft text-berry ring-studio-rail'
            : 'bg-accent text-white ring-surface'
        }`}
      >
        {count > 99 ? '99+' : count}
      </span>
    )
  }
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-control px-1.5 py-0.5 text-[0.65rem] font-bold ${
        active ? 'bg-white/25 text-white' : 'bg-accent-soft text-berry'
      }`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function ManageLayout() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [badges, setBadges] = useState({
    pending_orders: 0,
    pending_reviews: 0,
    low_stock_variants: 0,
  })
  const [websiteMapOpen, setWebsiteMapOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [railHover, setRailHover] = useState(false)
  const leaveTimerRef = useRef(null)
  const title = pageTitle(location.pathname)
  // Layout width follows pin state only — hover peeks as an overlay (no main-column jump).
  const peeking = collapsed && railHover
  const slim = collapsed && !peeking

  useEffect(() => {
    document.title = `${title} · Owner ops · Jordan Beauty Hub`
    return () => {
      document.title = 'Jordan Beauty Hub'
    }
  }, [title])

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  useEffect(() => {
    let alive = true
    portalService
      .navBadges()
      .then((data) => {
        if (alive) setBadges(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [location.pathname])

  useEffect(() => {
    const main = document.getElementById('manage-main')
    if (!main) return undefined
    // End hover-peek only — do not force-pin collapse (that fought the rail and flickered).
    const endPeek = () => {
      window.clearTimeout(leaveTimerRef.current)
      setRailHover(false)
    }
    main.addEventListener('pointerdown', endPeek)
    return () => {
      main.removeEventListener('pointerdown', endPeek)
      window.clearTimeout(leaveTimerRef.current)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    showToast('You have been signed out.', 'info')
    navigate('/login')
  }

  const toggleCollapsed = () => {
    window.clearTimeout(leaveTimerRef.current)
    setRailHover(false)
    setCollapsed((value) => !value)
  }

  const handleRailEnter = () => {
    window.clearTimeout(leaveTimerRef.current)
    if (collapsed) setRailHover(true)
  }

  const handleRailLeave = () => {
    window.clearTimeout(leaveTimerRef.current)
    leaveTimerRef.current = window.setTimeout(() => setRailHover(false), 140)
  }

  return (
    <div className="manage-shell min-h-dvh print:bg-white">
      <a
        href="#manage-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-berry focus:px-3 focus:py-2 focus:text-white print:hidden"
      >
        Skip to content
      </a>

      <div className="mx-auto flex min-h-dvh max-w-[96rem]">
        {/* Width slot stays pinned/collapsed only — peek overlays so content does not shift. */}
        <div
          className={`relative sticky top-0 z-30 h-dvh shrink-0 self-start print:hidden ${
            websiteMapOpen ? 'hidden' : 'hidden lg:block'
          } ${collapsed ? 'w-[4.25rem]' : 'w-[15.75rem]'}`}
        >
          <aside
            onMouseEnter={handleRailEnter}
            onMouseLeave={handleRailLeave}
            className={`manage-rail flex h-dvh flex-col overflow-hidden border-r border-white/10 text-white ${
              peeking
                ? 'absolute inset-y-0 left-0 z-40 w-[15.75rem] shadow-raised'
                : 'relative w-full'
            }`}
            aria-hidden={websiteMapOpen || undefined}
            aria-label="Owner portal"
            data-collapsed={slim ? 'true' : 'false'}
            data-peeking={peeking ? 'true' : 'false'}
          >
          <div className={`border-b border-white/10 ${slim ? 'px-2 py-4' : 'px-4 py-5'}`}>
            <div className={`flex items-center ${slim ? 'justify-center' : 'gap-3'}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-accent font-display text-sm font-bold text-white shadow-card">
                JBH
              </span>
              {!slim && (
                <div className="min-w-0">
                  <p className="font-display text-lg leading-none font-semibold tracking-tight">Jordan Beauty</p>
                  <p className="mt-1 text-[0.65rem] font-semibold tracking-[0.2em] text-accent-soft uppercase">
                    Owner studio
                  </p>
                </div>
              )}
            </div>
          </div>

          <nav aria-label="Owner portal" className={`scrollbar-dark flex-1 overflow-y-auto py-2 ${slim ? 'px-1.5' : 'px-2.5'}`}>
            {NAV_GROUPS.map((group) => (
              <div key={group.id} className={slim ? 'mb-1' : 'mb-3'}>
                {!slim ? (
                  <p className="px-3 pb-1 text-[0.6rem] font-semibold tracking-[0.18em] text-white/35 uppercase">
                    {group.label}
                  </p>
                ) : null}
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        title={item.label}
                        aria-label={item.label}
                        className={navClass(slim)}
                      >
                        {({ isActive }) => (
                          <>
                            <span className={`flex items-center ${slim ? '' : 'gap-2.5'}`}>
                              <FaIcon icon={item.icon} className="h-3.5 w-3.5 opacity-90" />
                              {!slim && item.label}
                            </span>
                            <Badge
                              count={badges[item.badgeKey]}
                              active={isActive}
                              collapsed={slim}
                              tone="dark"
                            />
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className={slim ? 'pt-1' : 'pt-0'}>
              <button
                type="button"
                onClick={() => setWebsiteMapOpen(true)}
                title="Website content"
                aria-label="Website content"
                className={`flex min-h-10 w-full items-center text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white ${
                  slim ? 'justify-center rounded-card' : 'gap-2.5 rounded-control px-3 text-left'
                }`}
              >
                <FaIcon icon="map" className="h-3.5 w-3.5" />
                {!slim && 'Website content'}
              </button>
            </div>
          </nav>

          <div className={`space-y-1 border-t border-white/10 text-sm ${slim ? 'p-1.5' : 'p-3'}`}>
            {!slim && <p className="truncate px-3 py-1 text-xs text-white/45">{user?.email}</p>}
            <a
              href="/"
              title="Store"
              aria-label="Store"
              className={`flex min-h-10 items-center text-white/70 hover:bg-white/10 hover:text-white ${
                slim ? 'justify-center rounded-card' : 'gap-2 rounded-control px-3'
              }`}
            >
              <FaIcon icon="store" className="h-3.5 w-3.5" />
              {!slim && <span>Store</span>}
            </a>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className={`flex min-h-10 w-full items-center text-left text-accent-soft hover:bg-white/10 ${
                slim ? 'justify-center rounded-card' : 'gap-2 rounded-control px-3'
              }`}
            >
              <FaIcon icon="logout" className="h-3.5 w-3.5" />
              {!slim && <span>Sign out</span>}
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? 'Keep sidebar expanded' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Keep sidebar expanded' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              className={`flex min-h-10 w-full items-center text-white/55 hover:bg-white/10 hover:text-white ${
                slim ? 'justify-center rounded-card' : 'gap-2 rounded-control px-3'
              }`}
            >
              <FaIcon icon={collapsed ? 'chevronRight' : 'chevronLeft'} className="h-3.5 w-3.5" />
              {!slim && <span>{collapsed ? 'Pin open' : 'Collapse'}</span>}
            </button>
          </div>
          </aside>
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          <header
            className={`sticky top-0 z-20 border-b border-line/80 bg-studio/90 backdrop-blur-md print:hidden ${
              websiteMapOpen ? 'hidden' : ''
            }`}
          >
            <div className="h-0.5 bg-gradient-to-r from-berry via-accent to-tile-peach" />
            <div className="flex items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 lg:px-8">
              <div className="min-w-0 flex-1 lg:hidden">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-accent font-display text-xs font-bold text-white">
                    JBH
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-ink sm:text-base">{title}</p>
                    <p className="truncate text-[0.7rem] text-muted sm:text-xs">{user?.email}</p>
                  </div>
                </div>
              </div>
              <div className="hidden min-w-0 items-center gap-3 lg:flex">
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  aria-expanded={!collapsed}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-btn border border-line bg-surface text-ink-soft shadow-studio transition-colors hover:bg-cream hover:text-ink"
                >
                  <FaIcon icon="bars" className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-muted uppercase">Owner studio</p>
                  <p className="font-display text-lg font-semibold tracking-tight text-ink">{title}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setWebsiteMapOpen(true)}
                  aria-label="Website map"
                  title="Website map"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-btn border border-line bg-surface text-berry shadow-studio transition-colors hover:bg-cream"
                >
                  <FaIcon icon="map" className="h-3.5 w-3.5" />
                </button>
                <a
                  href="/"
                  aria-label="Store"
                  title="Store"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-btn text-ink-soft transition-colors hover:bg-cream hover:text-ink"
                >
                  <FaIcon icon="store" className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  title="Sign out"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-btn text-danger transition-colors hover:bg-danger-soft lg:hidden"
                >
                  <FaIcon icon="logout" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <nav
              aria-label="Owner portal"
              className="scrollbar-hide -mx-0 overflow-x-auto border-t border-line px-2 py-2 lg:hidden"
            >
              <ul className="flex w-max min-w-full items-center gap-1">
                {NAV.map((item) => (
                  <li key={item.to} className="shrink-0">
                    <NavLink
                      to={item.to}
                      end={item.end}
                      title={item.label}
                      aria-label={item.label}
                      className={mobileNavClass}
                    >
                      {({ isActive }) => (
                        <>
                          <FaIcon icon={item.icon} className="h-3.5 w-3.5" />
                          <Badge count={badges[item.badgeKey]} active={isActive} collapsed />
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </header>

          <main
            id="manage-main"
            className="min-w-0 flex-1 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5 lg:px-8 lg:py-7 print:p-0"
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      <WebsiteContentModal isOpen={websiteMapOpen} onClose={() => setWebsiteMapOpen(false)} />
    </div>
  )
}
