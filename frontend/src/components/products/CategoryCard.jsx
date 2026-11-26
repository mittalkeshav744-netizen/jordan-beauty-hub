import { Link } from 'react-router'

import TruncateWithTooltip from '../common/TruncateWithTooltip'
import { categoryGradient } from '../../constants/theme'

/**
 * Shop-by-category tile: brand gradient sits behind, product photo sits in front.
 */
export default function CategoryCard({ category, index = 0 }) {
  const gradient = categoryGradient(index)

  return (
    <Link
      to={`/shop?category=${category.slug}`}
      className={`group relative flex aspect-square min-w-0 flex-col items-center overflow-hidden rounded-card bg-linear-to-b p-2.5 transition-transform duration-300 ease-standard hover:-translate-y-1 sm:p-3 ${gradient}`}
    >
      <TruncateWithTooltip
        text={category.name}
        className="relative z-10 w-full rounded-control bg-white/95 px-2 py-1.5 text-center text-[0.65rem] font-bold tracking-wider text-ink uppercase sm:text-xs"
      />

      {category.image ? (
        <img
          src={category.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="relative z-[1] mt-1.5 min-h-0 w-full flex-1 object-contain mix-blend-multiply transition-transform duration-300 ease-standard [mask-image:radial-gradient(closest-side,black_82%,transparent)] group-hover:scale-110"
        />
      ) : (
        <span
          aria-hidden="true"
          className="relative z-[1] flex flex-1 items-center font-display text-4xl font-bold text-white/85"
        >
          {category.name.charAt(0)}
        </span>
      )}
    </Link>
  )
}
