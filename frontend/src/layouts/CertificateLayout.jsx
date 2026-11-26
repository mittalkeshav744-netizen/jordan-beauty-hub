import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { PageLoader } from '../components/common/Spinner'
import FaIcon from '../components/manage/FaIcon'
import { useAuth } from '../hooks/useAuth'
import '../styles/certificate.css'

const NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { to: '/certificate/dashboard', label: 'Dashboard', icon: 'home', end: true },
    ],
  },
  {
    id: 'academy',
    label: 'Academy',
    items: [
      { to: '/certificate/courses', label: 'Courses', icon: 'courses' },
      { to: '/certificate/students', label: 'Students', icon: 'customers' },
      { to: '/certificate/groups', label: 'Groups', icon: 'groups' },
    ],
  },
  {
    id: 'studio',
    label: 'Studio',
    items: [
      { to: '/certificate/templates', label: 'Templates', icon: 'templates' },
      { to: '/certificate/generator', label: 'Generator', icon: 'generator' },
      { to: '/certificate/issued', label: 'Issued', icon: 'award' },
      { to: '/certificate/verify', label: 'Authenticity', icon: 'shield' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { to: '/certificate/email-center', label: 'Email center', icon: 'mail' },
      { to: '/certificate/jobs', label: 'Jobs', icon: 'jobs' },
      { to: '/certificate/reports', label: 'Reports', icon: 'chart' },
      { to: '/certificate/settings', label: 'Settings', icon: 'settings' },
    ],
  },
]

const NAV = NAV_GROUPS.flatMap((group) => group.items)

const SIDEBAR_KEY = 'jbh-cert-sidebar-collapsed'

function pageTitle(pathname) {
  if (pathname.includes('/templates/') && pathname.includes('/edit')) return 'Edit template'
  if (pathname.includes('/templates/create')) return 'Create template'
  if (pathname.includes('/issued/') && !pathname.includes('/verify')) return 'Certificate detail'
  if (pathname.startsWith('/certificate/verify/')) return 'Authenticity'
  const match = NAV.find((item) =>
    item.end ? pathname === item.to || pathname === '/certificate' : pathname.startsWith(item.to),
  )
  return match?.label || 'Certificates'
}

function isPublicVerifyPath(pathname) {
  return pathname === '/certificate/verify' || pathname.startsWith('/certificate/verify/')
}

function readCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

export default function CertificateLayout() {
  const { user, logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const staffPortal = Boolean(isAuthenticated && user?.is_staff)
  const publicVerify = isPublicVerifyPath(location.pathname) && !staffPortal

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const title = pageTitle(location.pathname)

  useEffect(() => {
    if (publicVerify) return undefined
    document.title = `${title} · Certificate Studio · Jordan Beauty Hub`
    return () => {
      document.title = 'Jordan Beauty Hub'
    }
  }, [title, publicVerify])

  // QR / public serial checks stay on the same URL without the staff chrome.
  if (publicVerify) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Outlet context={{ inPortal: false }} />
      </Suspense>
    )
  }

  return (
    <div className="cert-shell flex">
      <a
        href="#cert-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[0.625rem] focus:bg-[var(--cert-navy)] focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[var(--cert-navy)]/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`cert-sidebar flex flex-col ${collapsed ? 'is-collapsed' : ''} ${
          mobileOpen ? 'is-open' : ''
        }`}
      >
        <div
          className={`flex items-center border-b border-white/10 px-3 py-4 ${
            collapsed ? 'flex-col gap-2' : 'justify-between gap-2'
          }`}
        >
          {collapsed ? (
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-[0.625rem] bg-white/10 text-[var(--cert-gold)]"
              title="Certificates"
            >
              <FaIcon icon="award" className="h-4 w-4" />
            </span>
          ) : (
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-white/10 text-[var(--cert-gold)]">
                <FaIcon icon="award" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[0.62rem] font-semibold tracking-[0.18em] text-[var(--cert-gold)] uppercase">
                  Jordan Beauty Hub
                </p>
                <p className="truncate font-[family-name:var(--font-cert-display)] text-lg leading-tight font-semibold">
                  Certificates
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.625rem] text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cert-gold)]"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            <FaIcon icon={collapsed ? 'chevronRight' : 'chevronLeft'} className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto p-2.5" aria-label="Certificate navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.id}>
              {!collapsed ? (
                <p className="px-3 pb-1 text-[0.6rem] font-semibold tracking-[0.18em] text-white/40 uppercase">
                  {group.label}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={item.label}
                    aria-label={item.label}
                    className={({ isActive }) =>
                      `cert-nav-link text-sm ${isActive ? 'is-active font-semibold' : ''} ${
                        collapsed ? 'justify-center px-0' : ''
                      }`
                    }
                  >
                    <FaIcon icon={item.icon} className="h-4 w-4 shrink-0" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-2.5">
          {!collapsed && user?.email ? (
            <p className="truncate px-3 py-1 text-xs text-white/45">{user.email}</p>
          ) : null}
          <button
            type="button"
            className={`cert-nav-link w-full text-sm ${collapsed ? 'justify-center px-0' : ''}`}
            onClick={() => navigate('/manage')}
            title="Owner portal"
            aria-label="Owner portal"
          >
            <FaIcon icon="store" className="h-4 w-4 shrink-0" />
            {!collapsed ? <span>Owner portal</span> : null}
          </button>
        </div>
      </aside>

      <div className="cert-main">
        <header className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-[var(--cert-line)] bg-[var(--cert-ivory)]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="cert-btn-outline cert-icon-btn lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              title="Open menu"
            >
              <FaIcon icon="bars" className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--cert-gold)] uppercase">
                Certificate studio
              </p>
              <h1 className="truncate font-[family-name:var(--font-cert-display)] text-xl font-semibold text-[var(--cert-navy)]">
                {title}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <span className="hidden text-xs text-[var(--cert-muted)] md:inline">{user?.email}</span>
            <button
              type="button"
              className="cert-btn-outline cert-btn-sm"
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
              aria-label="Sign out"
              title="Sign out"
            >
              <FaIcon icon="logout" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main id="cert-main" className="cert-main__body px-4 py-5 sm:px-6 lg:px-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet context={{ inPortal: true }} />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
