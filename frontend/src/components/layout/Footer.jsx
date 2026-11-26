import { Link } from 'react-router'

import {
  FOOTER_ACCOUNT_LINKS,
  FOOTER_SHOP_BASE_LINKS,
  STORE_NAME,
} from '../../constants/navigation'
import { POLICY_LINKS } from '../../constants/policies'
import { useAuth } from '../../hooks/useAuth'
import { useNavCategories } from '../../hooks/useNavCategories'
import { useStoreSettings, whatsappLink } from '../../hooks/useStoreSettings'
import { useStorefront } from '../../hooks/useStorefront'
import { categoryShopPath, topCategories } from '../../utils/categories'
import Logo from './Logo'
import NewsletterSignup from './NewsletterSignup'

const CURRENT_YEAR = new Date().getFullYear()
const DEFAULT_TAGLINE =
  'Makeup, skincare, haircare and body care — chosen with care and delivered across India.'

const PARTICLE_SPOTS = [
  { left: '12%', bottom: '18%', delay: '0s' },
  { left: '28%', bottom: '42%', delay: '2.2s' },
  { left: '48%', bottom: '22%', delay: '4.1s' },
  { left: '64%', bottom: '55%', delay: '1.4s' },
  { left: '78%', bottom: '30%', delay: '3.3s' },
  { left: '88%', bottom: '48%', delay: '5.5s' },
]

function normalizeLinks(links, fallback) {
  if (Array.isArray(links) && links.length > 0) {
    return links
      .map((link) => ({
        label: link.label || '',
        to: link.to || '/',
        ...(link.show ? { show: link.show } : {}),
      }))
      .filter((link) => link.label && link.to)
  }
  return fallback
}

export default function Footer() {
  const { isAuthenticated } = useAuth()
  const chatLink = whatsappLink(useStoreSettings(), 'Hi, I have a question about an order or product.')
  const hiddenAudience = isAuthenticated ? 'guest' : 'member'
  const { categories } = useNavCategories()
  const { config } = useStorefront()

  const tagline = config?.footer_tagline || DEFAULT_TAGLINE
  const includeCategories = config?.footer_include_categories !== false
  const shopBase = normalizeLinks(config?.footer_shop_links, FOOTER_SHOP_BASE_LINKS)
  const shopLinks = [
    ...shopBase,
    ...(includeCategories
      ? topCategories(categories).map((category) => ({
          label: category.name,
          to: categoryShopPath(category),
        }))
      : []),
  ]

  const groups = [
    {
      title: config?.footer_shop_title || 'Shop',
      links: shopLinks,
    },
    {
      title: config?.footer_account_title || 'My account',
      links: normalizeLinks(config?.footer_account_links, FOOTER_ACCOUNT_LINKS),
    },
    {
      title: config?.footer_help_title || 'Help',
      links: normalizeLinks(config?.footer_help_links, POLICY_LINKS),
    },
  ]

  return (
    <footer className="mt-8 sm:mt-16" data-manage-edit="/manage/storefront?focus=footer" data-manage-label="Footer">
      <div className="footer-beauty">
        <div className="footer-beauty__fx" aria-hidden="true">
          <span className="footer-beauty__glow footer-beauty__glow--a" />
          <span className="footer-beauty__glow footer-beauty__glow--b" />
          <span className="footer-beauty__glow footer-beauty__glow--c" />
          <span className="footer-beauty__shimmer" />
          {PARTICLE_SPOTS.map((spot) => (
            <span
              key={`${spot.left}-${spot.bottom}`}
              className="footer-beauty__particle"
              style={{ left: spot.left, bottom: spot.bottom, animationDelay: spot.delay }}
            />
          ))}
        </div>

        <div className="footer-beauty__content">
          <div className="page-container grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 sm:gap-10 sm:py-12 lg:grid-cols-5 lg:gap-8">
            <div className="sm:col-span-2">
              <Link to="/" className="footer-beauty__logo" aria-label={STORE_NAME}>
                <Logo tone="light" />
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{tagline}</p>
              <NewsletterSignup variant="footer" />
              {chatLink ? (
                <a
                  href={chatLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center rounded-btn border border-white/25 bg-white/5 px-4 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors hover:border-[color:var(--color-footer-blush)] hover:bg-white/10 hover:text-white"
                >
                  Chat with us on WhatsApp
                </a>
              ) : null}
            </div>

            {groups.map((group) => (
              <div key={group.title} className="min-w-0">
                <h2 className="text-xs font-semibold tracking-[0.18em] text-white/90 uppercase">
                  {group.title}
                </h2>
                <ul className="mt-3 space-y-0.5">
                  {group.links
                    .filter((link) => link.show !== hiddenAudience)
                    .map((link) => (
                      <li key={link.to + link.label}>
                        <Link to={link.to} className="footer-beauty__link text-sm">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="relative border-t border-white/10">
            <p className="page-container py-4 text-xs text-white/55 sm:py-5">
              © {CURRENT_YEAR} {STORE_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
