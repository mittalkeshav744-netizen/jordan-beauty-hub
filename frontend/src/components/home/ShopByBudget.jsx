import { Link } from 'react-router'

import { BUDGET_LINKS } from '../../constants/navigation'
import Reveal from '../common/Reveal'

function normalizeTiles(tiles) {
  if (Array.isArray(tiles) && tiles.length > 0) {
    return tiles
      .map((tile) => ({
        label: tile.label || 'Under',
        amount: tile.amount || '',
        to: tile.to || '/shop',
      }))
      .filter((tile) => tile.amount)
  }
  return BUDGET_LINKS
}

export default function ShopByBudget({ tiles }) {
  const links = normalizeTiles(tiles)
  if (links.length === 0) return null

  return (
    <section aria-labelledby="budget-heading" className="bg-ink py-7 text-white sm:py-14">
      <div className="page-container space-y-4 sm:space-y-6">
        <div className="text-center">
          <h2 id="budget-heading" className="section-title">
            Shop by budget
          </h2>
          <p className="mt-1 text-sm text-white/70">Great beauty at every price.</p>
        </div>
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-4">
          {links.map((link, index) => (
            <Reveal as="li" key={`${link.to}-${link.amount}-${index}`} delay={80 * index}>
              <Link
                to={link.to}
                className="group flex aspect-[4/3] flex-col items-center justify-center rounded-card border border-white/15 bg-white/5 text-center transition-all duration-300 ease-standard hover:-translate-y-1 hover:border-accent hover:bg-accent"
              >
                <span className="text-[0.65rem] font-semibold tracking-[0.24em] text-white/70 uppercase group-hover:text-white sm:text-xs sm:tracking-[0.3em]">
                  {link.label}
                </span>
                <span className="font-display text-2xl font-extrabold sm:text-5xl">{link.amount}</span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
