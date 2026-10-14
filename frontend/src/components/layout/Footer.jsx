import { Link } from 'react-router'

import { FOOTER_LINK_GROUPS, STORE_NAME } from '../../constants/navigation'
import { useAuth } from '../../hooks/useAuth'
import Logo from './Logo'

const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  const { isAuthenticated } = useAuth()
  const hiddenAudience = isAuthenticated ? 'guest' : 'member'

  return (
    <footer className="mt-12 bg-ink text-white sm:mt-16">
      <div className="page-container grid grid-cols-2 gap-x-6 gap-y-8 py-10 sm:gap-10 sm:py-12 lg:grid-cols-4">
        <div className="col-span-2">
          <Logo tone="light" />
          <p className="mt-3 max-w-sm text-sm text-white/70">
            Makeup, skincare, haircare and body care — chosen with care and delivered across India.
          </p>
        </div>
        {FOOTER_LINK_GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-semibold tracking-widest uppercase">{group.title}</h2>
            <ul className="mt-3 space-y-1">
              {group.links.filter((link) => link.show !== hiddenAudience).map((link) => (
                <li key={link.to + link.label}>
                  <Link to={link.to} className="inline-block py-1.5 text-sm text-white/70 hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="page-container py-5 text-xs text-white/60">
          © {CURRENT_YEAR} {STORE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
