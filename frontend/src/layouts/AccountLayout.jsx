import { NavLink, Outlet, useNavigate } from 'react-router'

import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

const ACCOUNT_LINKS = [
  { label: 'Profile & addresses', to: '/account', end: true },
  { label: 'My orders', to: '/account/orders' },
  { label: 'My courses', to: '/account/courses' },
  { label: 'Wishlist', to: '/account/wishlist' },
]

export default function AccountLayout() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    showToast('You have been signed out.', 'info')
    navigate('/')
  }

  return (
    <div className="page-container py-5 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <h1 className="section-title">My account</h1>
        <p className="mt-1 text-sm break-all text-muted">Signed in as {user.email}</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8">
        <nav aria-label="Account" className="min-w-0">
          <ul className="flex flex-wrap gap-1.5 sm:gap-2 md:flex-col">
            {ACCOUNT_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex min-h-10 items-center rounded-control px-2.5 text-sm whitespace-nowrap sm:min-h-11 sm:px-3 ${
                      isActive ? 'bg-ink font-semibold text-white' : 'hover:bg-subtle'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex h-11 w-11 items-center justify-center rounded-btn text-danger hover:bg-danger-soft"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" />
                  <path d="M15 12H3m0 0 3-3m-3 3 3 3" />
                </svg>
              </button>
            </li>
          </ul>
        </nav>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
