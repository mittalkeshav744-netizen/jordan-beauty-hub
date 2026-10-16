import { Link } from 'react-router'

import { BUDGET_LINKS } from '../../constants/navigation'
import Reveal from '../common/Reveal'

export default function ShopByBudget() {
  return (
    <section aria-labelledby="budget-heading" className="bg-ink py-10 text-white sm:py-14">
      <div className="page-container space-y-6">
        <div className="text-center">
          <h2 id="budget-heading" className="section-title">
            Shop by budget
          </h2>
          <p className="mt-1 text-sm text-white/70">Great beauty at every price.</p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {BUDGET_LINKS.map((link, index) => (
            <Reveal as="li" key={link.to} delay={80 * index}>
              <Link
                to={link.to}
                className="group flex aspect-[4/3] flex-col items-center justify-center rounded-card border border-white/15 bg-white/5 text-center transition-all duration-300 ease-standard hover:-translate-y-1 hover:border-accent hover:bg-accent"
              >
                <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase group-hover:text-white">
                  {link.label}
                </span>
                <span className="font-display text-3xl font-extrabold sm:text-5xl">{link.amount}</span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
