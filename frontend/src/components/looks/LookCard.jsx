import { Link } from 'react-router'

import ProductImage from '../common/ProductImage'
import TruncateWithTooltip from '../common/TruncateWithTooltip'

/** Cover photo, or a spaced collage of product photos when no cover is uploaded. */
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

  const images = (look.preview_images?.length ? look.preview_images : [null]).slice(0, 4)

  if (images.length === 1) {
    return (
      <ProductImage
        src={images[0]}
        alt=""
        className="h-full w-full object-cover transition-transform duration-500 ease-standard group-hover:scale-105"
      />
    )
  }

  // Spaced mosaic so product photos stay distinct (no edge-to-edge merge).
  if (images.length === 2) {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-1.5 bg-subtle p-1.5 sm:gap-2 sm:p-2">
        {images.map((src, index) => (
          <div key={src ?? index} className="overflow-hidden rounded-control bg-surface shadow-card">
            <ProductImage
              src={src}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 ease-standard group-hover:scale-105"
            />
          </div>
        ))}
      </div>
    )
  }

  if (images.length === 3) {
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1.5 bg-subtle p-1.5 sm:gap-2 sm:p-2">
        <div className="row-span-2 overflow-hidden rounded-control bg-surface shadow-card">
          <ProductImage
            src={images[0]}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 ease-standard group-hover:scale-105"
          />
        </div>
        {images.slice(1).map((src, index) => (
          <div key={src ?? index} className="overflow-hidden rounded-control bg-surface shadow-card">
            <ProductImage
              src={src}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 ease-standard group-hover:scale-105"
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1.5 bg-subtle p-1.5 sm:gap-2 sm:p-2">
      {images.map((src, index) => (
        <div key={src ?? index} className="overflow-hidden rounded-control bg-surface shadow-card">
          <ProductImage
            src={src}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 ease-standard group-hover:scale-105"
          />
        </div>
      ))}
    </div>
  )
}

export default function LookCard({ look }) {
  return (
    <Link
      to={`/looks/${look.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-[box-shadow,transform] duration-300 ease-standard hover:-translate-y-1 hover:shadow-raised"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-line bg-subtle">
        <LookCover look={look} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-ink/35 to-transparent"
        />
        {look.occasion && (
          <span className="absolute top-2.5 left-2.5 rounded-control bg-ink/80 px-2 py-1 text-[0.65rem] font-semibold tracking-wider text-white uppercase backdrop-blur-sm sm:top-3 sm:left-3">
            {look.occasion}
          </span>
        )}
        {look.has_video && (
          <span className="absolute top-2.5 right-2.5 rounded-control bg-accent px-2 py-1 text-[0.65rem] font-semibold tracking-wider text-white uppercase sm:top-3 sm:right-3">
            ▶ Video
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-3.5">
        <h3 className="font-display text-base leading-tight font-bold sm:text-lg">
          <TruncateWithTooltip text={look.title} />
        </h3>
        {look.description ? (
          <p className="line-clamp-2 text-xs text-ink-soft sm:text-sm">{look.description}</p>
        ) : null}
        <p className="mt-auto flex items-center justify-between gap-2 pt-2 text-[0.65rem] font-semibold tracking-widest uppercase sm:pt-2.5 sm:text-xs">
          <span className="text-muted">
            {look.product_count} product{look.product_count === 1 ? '' : 's'}
          </span>
          <span className="text-accent transition-transform duration-300 group-hover:translate-x-1">
            Shop the look →
          </span>
        </p>
      </div>
    </Link>
  )
}
