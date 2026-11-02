import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { HERO_VIDEO } from '../../constants/media'
import { useApi } from '../../hooks/useApi'
import { catalogService } from '../../services/catalogService'
import AmbientVideo from '../common/AmbientVideo'
import Button from '../common/Button'
import ProductImage from '../common/ProductImage'

const DEFAULT_ROTATING = ['Zero compromise.', 'Made for Indian skin.', 'Glow all day.']
const ROTATE_EVERY_MS = 2800
const CARD_LAYOUT = [
  { tilt: '-6deg', className: 'left-0 top-10 w-[46%]', delay: '0s' },
  { tilt: '5deg', className: 'right-0 top-0 w-[44%]', delay: '1.2s' },
  { tilt: '-2deg', className: 'left-[26%] bottom-0 w-[48%]', delay: '2.4s' },
]

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function RotatingLine({ lines }) {
  const [index, setIndex] = useState(0)
  const items = lines?.length ? lines : DEFAULT_ROTATING
  const itemsKey = items.join('|')

  useEffect(() => {
    setIndex(0)
  }, [itemsKey])

  useEffect(() => {
    if (prefersReducedMotion() || items.length < 2) return undefined
    const timer = setInterval(() => setIndex((current) => (current + 1) % items.length), ROTATE_EVERY_MS)
    return () => clearInterval(timer)
  }, [itemsKey, items.length])

  return (
    <span aria-hidden="true" className="grid text-accent">
      {items.map((line) => (
        <span key={line} className="invisible col-start-1 row-start-1">
          {line}
        </span>
      ))}
      <span key={`${index}-${items[index]}`} className="col-start-1 row-start-1 animate-fade-up">
        {items[index]}
      </span>
    </span>
  )
}

function ProductCollage() {
  const { data } = useApi(() => catalogService.getProducts({ featured: 'true', page_size: 3 }))
  const products = data?.results ?? []

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      {CARD_LAYOUT.map((layout, index) => {
        const product = products[index]
        return (
          <div
            key={layout.tilt}
            style={{ '--tilt': layout.tilt, animationDelay: layout.delay }}
            className={`absolute animate-float overflow-hidden rounded-card bg-surface p-2 shadow-raised ${layout.className}`}
          >
            {product ? (
              <Link to={`/products/${product.slug}`} className="block">
                <ProductImage
                  src={product.primary_image?.image}
                  alt={product.name}
                  className="aspect-square w-full rounded-control"
                />
                <span className="block truncate px-1 pt-2 text-xs font-semibold text-ink">{product.name}</span>
              </Link>
            ) : (
              <div className="aspect-square w-full animate-pulse rounded-control bg-subtle" />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function HeroSection({ config }) {
  const rotating = config?.hero_rotating_lines?.length ? config.hero_rotating_lines : DEFAULT_ROTATING
  const tag = config?.hero_tag || 'New season edit'
  const title = config?.hero_title || 'Bold colour.'
  const primaryText = config?.hero_primary_cta_text || 'Shop now'
  const primaryLink = config?.hero_primary_cta_link || '/shop'
  const secondaryText = config?.hero_secondary_cta_text || 'Skin quiz'
  const secondaryLink = config?.hero_secondary_cta_link || '/skin-quiz'
  const mediaType = config?.hero_media_type || 'video'
  const videoSrc = config?.hero_video_file_url || config?.hero_video_url || HERO_VIDEO.src
  const loopEnd = Number(config?.hero_video_loop_end ?? HERO_VIDEO.loopEnd ?? 7)
  const showVideo = mediaType !== 'collage' && Boolean(videoSrc)

  return (
    <section
      className="relative isolate overflow-hidden bg-ink text-white"
      data-manage-edit="/manage/storefront?focus=hero"
      data-manage-label="Hero & homepage banner"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-20">
        <span className="absolute -top-24 -left-24 h-80 w-80 animate-blob rounded-full bg-accent/40 blur-3xl" />
        <span className="absolute top-1/3 right-0 h-96 w-96 animate-blob rounded-full bg-tile-orchid-deep/40 blur-3xl [animation-delay:-5s]" />
        <span className="absolute -bottom-32 left-1/3 h-72 w-72 animate-blob rounded-full bg-tile-peach-deep/30 blur-3xl [animation-delay:-10s]" />
      </div>

      <div className="page-container grid items-center gap-6 py-8 sm:gap-10 sm:py-16 md:grid-cols-2 lg:py-20">
        <div className="space-y-4 sm:space-y-6">
          <p className="text-[0.65rem] font-semibold tracking-[0.28em] text-accent uppercase sm:text-xs sm:tracking-[0.3em]">
            {tag}
          </p>
          <h1 className="text-display font-bold uppercase">
            <span className="sr-only">
              {title} {rotating[0]}
            </span>
            <span aria-hidden="true" className="block">
              {title}
            </span>
            <RotatingLine lines={rotating} />
          </h1>
          <p className="max-w-md text-sm text-white/75 sm:text-base">
            Long-wear makeup and skin-loving care, made for Indian skin tones and every day.
          </p>
          <div className="grid grid-cols-2 gap-2.5 min-[480px]:flex min-[480px]:flex-wrap sm:gap-3">
            <Button variant="accent" size="lg" to={primaryLink} className="px-3 sm:px-7">
              {primaryText}
            </Button>
            <Button
              size="lg"
              to={secondaryLink}
              className="border border-white bg-transparent px-3 hover:bg-white hover:text-ink sm:px-7"
            >
              {secondaryText}
            </Button>
          </div>
        </div>
        {showVideo ? (
          <div className="absolute inset-0 -z-10 md:relative md:inset-auto md:z-auto md:flex md:justify-center">
            <AmbientVideo
              src={videoSrc}
              loopEnd={loopEnd}
              poster={HERO_VIDEO.poster}
              style={{ '--tilt': '2deg' }}
              className="h-full w-full md:aspect-[9/16] md:h-auto md:max-w-[17rem] md:animate-float md:rounded-card md:shadow-raised md:ring-4 md:ring-white/10 lg:max-w-[19rem]"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink/90 via-ink/60 to-ink/45 md:hidden" />
          </div>
        ) : (
          <ProductCollage />
        )}
      </div>
    </section>
  )
}
