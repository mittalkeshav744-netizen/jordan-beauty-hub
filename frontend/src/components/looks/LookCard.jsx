import { Link } from 'react-router'

import ProductImage from '../common/ProductImage'

/** Cover photo, or a collage of the look's product photos when no cover is uploaded. */
function LookCover({ look }) {
  if (look.cover_image) {
    return (
      <img
        src={look.cover_image}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 ease-standard group-hover:scale-105"
      />
    )
  }
  const images = look.preview_images.length ? look.preview_images : [null]
  return (
    <div className={`grid h-full w-full gap-1 bg-subtle ${images.length > 1 ? 'grid-cols-2' : ''}`}>
      {images.map((src, index) => (
        <ProductImage
          key={src ?? index}
          src={src}
          alt=""
          className={`h-full w-full transition-transform duration-500 ease-standard group-hover:scale-105 ${
            images.length === 3 && index === 0 ? 'row-span-2' : ''
          }`}
        />
      ))}
    </div>
  )
}

export default function LookCard({ look }) {
  return (
    <Link
      to={`/looks/${look.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-all duration-300 ease-standard hover:-translate-y-1 hover:shadow-raised"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <LookCover look={look} />
        {look.occasion && (
          <span className="absolute top-3 left-3 rounded-control bg-ink/80 px-2 py-1 text-[0.65rem] font-semibold tracking-wider text-white uppercase">
            {look.occasion}
          </span>
        )}
        {look.has_video && (
          <span className="absolute top-3 right-3 rounded-control bg-accent px-2 py-1 text-[0.65rem] font-semibold tracking-wider text-white uppercase">
            ▶ Video
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-display text-lg leading-tight font-bold">{look.title}</h3>
        {look.description && <p className="line-clamp-2 text-sm text-ink-soft">{look.description}</p>}
        <p className="mt-auto flex items-center justify-between pt-3 text-xs font-semibold tracking-widest uppercase">
          <span className="text-muted">
            {look.product_count} product{look.product_count === 1 ? '' : 's'}
          </span>
          <span className="text-accent transition-transform duration-300 group-hover:translate-x-1">Shop the look →</span>
        </p>
      </div>
    </Link>
  )
}
