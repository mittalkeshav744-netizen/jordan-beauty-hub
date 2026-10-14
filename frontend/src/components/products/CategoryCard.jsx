import { Link } from 'react-router'

import { categoryGradient } from '../../constants/theme'

export default function CategoryCard({ category, index = 0 }) {
  const gradient = categoryGradient(index)

  return (
    <Link
      to={`/shop?category=${category.slug}`}
      className={`group relative flex aspect-square min-w-0 flex-col items-center overflow-hidden rounded-card bg-linear-to-b p-2.5 shadow-card transition-transform duration-300 ease-standard hover:-translate-y-1 hover:shadow-raised sm:p-3 ${gradient}`}
    >
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/5 bg-black/10" />
      <span className="relative z-10 w-full truncate rounded-control bg-white/95 px-2 py-1.5 text-center text-[0.65rem] font-bold tracking-wider text-ink uppercase shadow-card sm:text-xs">
        {category.name}
      </span>
      {category.image ? (
        <img
          src={category.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="relative mt-1.5 min-h-0 w-full flex-1 object-contain mix-blend-multiply transition-transform duration-300 ease-standard [mask-image:radial-gradient(closest-side,black_80%,transparent)] group-hover:scale-110"
        />
      ) : (
        <span aria-hidden="true" className="flex flex-1 items-center font-display text-4xl font-bold text-white/80">
          {category.name.charAt(0)}
        </span>
      )}
    </Link>
  )
}
