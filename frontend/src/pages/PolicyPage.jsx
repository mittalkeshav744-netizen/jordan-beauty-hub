import { Link, useParams } from 'react-router'

import Breadcrumbs from '../components/common/Breadcrumbs'
import { POLICIES, POLICY_LAST_UPDATED, POLICY_LINKS } from '../constants/policies'
import NotFoundPage from './NotFoundPage'

export default function PolicyPage() {
  const { slug } = useParams()
  const policy = Object.hasOwn(POLICIES, slug) ? POLICIES[slug] : null
  if (!policy) return <NotFoundPage />

  return (
    <div className="page-container pb-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: policy.title }]} />
      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Store policies" className="order-last lg:order-first">
          <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">Policies</h2>
          <ul className="mt-2 space-y-1">
            {POLICY_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  aria-current={link.to === `/policies/${slug}` ? 'page' : undefined}
                  className="inline-block py-1.5 text-sm text-ink-soft hover:text-accent aria-[current=page]:font-semibold aria-[current=page]:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-3xl space-y-6">
          <header className="space-y-2">
            <h1 className="section-title">{policy.title}</h1>
            <p className="text-xs text-muted">Last updated {POLICY_LAST_UPDATED}</p>
            <p className="prose-text">{policy.intro}</p>
          </header>
          {policy.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h2 className="text-base font-semibold">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="prose-text">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}
