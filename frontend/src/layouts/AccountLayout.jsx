import { NavLink, Outlet, useNavigate } from 'react-router'

import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

const ACCOUNT_LINKS = [
  { label: 'Profile & addresses', to: '/account', end: true },
  { label: 'My orders', to: '/account/orders' },
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
    <div className="page-container py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="section-title">My account</h1>
        <p className="mt-1 text-sm break-all text-muted">Signed in as {user.email}</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8">
        <nav aria-label="Account" className="min-w-0">
          <ul className="flex flex-wrap gap-2 md:flex-col">
            {ACCOUNT_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center rounded-control px-3 text-sm whitespace-nowrap ${
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
                className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-sm whitespace-nowrap text-danger hover:bg-danger-soft"
              >
                Sign out
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
