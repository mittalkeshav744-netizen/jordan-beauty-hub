import { Link } from 'react-router'

import { STORE_NAME } from '../../constants/navigation'
import Logo from './Logo'

/**
 * Split-screen auth chrome: beauty showcase (left) + form panel (right).
 * Decorative layers are pointer-events: none and respect reduced motion via CSS.
 */
export default function AuthShell({
  children,
  heading,
  description,
  footer,
  eyebrow = 'Jordan Beauty Hub',
}) {
  return (
    <div className="auth-beauty">
      <div className="mx-auto grid min-h-[calc(100dvh-8rem)] w-full max-w-6xl lg:min-h-[min(42rem,calc(100dvh-7rem))] lg:grid-cols-2 lg:overflow-hidden lg:rounded-card lg:border lg:border-line lg:shadow-raised lg:my-6">
        <aside className="auth-beauty__stage relative flex flex-col justify-between px-6 py-10 sm:px-10 sm:py-12 lg:min-h-full">
          <div
            className="auth-beauty__orb absolute -top-10 -left-8 h-44 w-44"
            style={{ background: 'color-mix(in srgb, var(--color-auth-blush) 70%, transparent)' }}
          />
          <div
            className="auth-beauty__orb absolute right-0 bottom-10 h-56 w-56"
            style={{
              background: 'color-mix(in srgb, var(--color-auth-plum) 35%, transparent)',
              animationDelay: '-4s',
            }}
          />
          <div
            className="auth-beauty__orb absolute top-1/3 left-1/3 h-28 w-28"
            style={{ background: 'color-mix(in srgb, white 45%, transparent)', animationDelay: '-8s' }}
          />

          <div className="relative z-[1]">
            <Link to="/" className="inline-flex rounded-btn focus-visible:outline-accent">
              <Logo />
            </Link>
            <p
              className="mt-8 text-[0.65rem] font-semibold tracking-[0.22em] uppercase"
              style={{ color: 'var(--color-auth-plum)' }}
            >
              {eyebrow}
            </p>
            <h1
              className="mt-3 max-w-sm font-display text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: 'var(--color-auth-charcoal)' }}
            >
              Your Beauty, Your Glow.
            </h1>
            <p
              className="mt-3 max-w-sm text-sm leading-relaxed"
              style={{ color: 'color-mix(in srgb, var(--color-auth-plum) 80%, transparent)' }}
            >
              Discover beauty that feels like you — makeup, skincare and care, made for real skin.
            </p>
          </div>

          <ul className="relative z-[1] mt-10 flex flex-wrap gap-3 lg:mt-0" aria-hidden="true">
            {['Glow serum', 'Soft blush', 'Velvet lips'].map((label, index) => (
              <li
                key={label}
                className="auth-beauty__card rounded-card border border-white/50 bg-white/55 px-4 py-3 text-xs font-semibold tracking-wide shadow-card backdrop-blur-sm"
                style={{
                  color: 'var(--color-auth-plum)',
                  animationDelay: `${index * 0.4}s`,
                }}
              >
                {label}
              </li>
            ))}
          </ul>
        </aside>

        <section className="relative flex items-center bg-surface px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="auth-beauty__panel mx-auto w-full max-w-md">
            <div className="mb-6 text-center lg:text-left">
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {heading}
              </h2>
              {description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
              ) : null}
            </div>
            {children}
            {footer ? <div className="mt-6 text-center text-sm text-muted lg:text-left">{footer}</div> : null}
            <p className="mt-6 text-center text-[0.7rem] text-muted lg:text-left">
              By continuing you agree to our{' '}
              <Link to="/policies/terms" className="font-semibold text-accent hover:underline">
                Terms
              </Link>
              .
            </p>
            <p className="sr-only">{STORE_NAME} account</p>
          </div>
        </section>
      </div>
    </div>
  )
}
