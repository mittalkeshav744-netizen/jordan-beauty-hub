import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { HERO_VIDEO } from '../../constants/media'
import { useApi } from '../../hooks/useApi'
import { catalogService } from '../../services/catalogService'
import AmbientVideo from '../common/AmbientVideo'
import Button from '../common/Button'
import ProductImage from '../common/ProductImage'

const ROTATING_LINES = ['Zero compromise.', 'Made for Indian skin.', 'Glow all day.']
const ROTATE_EVERY_MS = 2800
const CARD_LAYOUT = [
  { tilt: '-6deg', className: 'left-0 top-10 w-[46%]', delay: '0s' },
  { tilt: '5deg', className: 'right-0 top-0 w-[44%]', delay: '1.2s' },
  { tilt: '-2deg', className: 'left-[26%] bottom-0 w-[48%]', delay: '2.4s' },
]

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function RotatingLine() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    const timer = setInterval(() => setIndex((current) => (current + 1) % ROTATING_LINES.length), ROTATE_EVERY_MS)
    return () => clearInterval(timer)
  }, [])

  // Every line sits invisibly in the same grid cell so the block keeps the height of the longest one.
  return (
    <span aria-hidden="true" className="grid text-accent">
      {ROTATING_LINES.map((line) => (
        <span key={line} className="invisible col-start-1 row-start-1">
          {line}
        </span>
      ))}
      <span key={index} className="col-start-1 row-start-1 animate-fade-up">
        {ROTATING_LINES[index]}
      </span>
    </span>
  )
}

/** Floating cards with bestseller photos, shown while no banner video is set. */
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

export default function HeroSection() {
  const hasVideo = Boolean(HERO_VIDEO.src)

  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      <div aria-hidden="true" className="absolute inset-0 -z-20">
        <span className="absolute -top-24 -left-24 h-80 w-80 animate-blob rounded-full bg-accent/40 blur-3xl" />
        <span className="absolute top-1/3 right-0 h-96 w-96 animate-blob rounded-full bg-tile-orchid-deep/40 blur-3xl [animation-delay:-5s]" />
        <span className="absolute -bottom-32 left-1/3 h-72 w-72 animate-blob rounded-full bg-tile-peach-deep/30 blur-3xl [animation-delay:-10s]" />
      </div>

      <div className="page-container grid items-center gap-10 py-12 sm:py-16 md:grid-cols-2 lg:py-20">
        <div className="space-y-6">
          <p className="text-xs font-semibold tracking-[0.3em] text-accent uppercase">New season edit</p>
          <h1 className="text-display font-bold uppercase">
            <span className="sr-only">Bold colour. Zero compromise.</span>
            <span aria-hidden="true" className="block">
              Bold colour.
            </span>
            <RotatingLine />
          </h1>
          <p className="max-w-md text-sm text-white/75 sm:text-base">
            Long-wear makeup and skin-loving care, made for Indian skin tones and every day.
          </p>
          <div className="grid grid-cols-2 gap-3 min-[480px]:flex min-[480px]:flex-wrap">
            <Button variant="accent" size="lg" to="/shop" className="px-4 sm:px-7">
              Shop now
            </Button>
            <Button
              size="lg"
              to="/skin-quiz"
              className="border border-white bg-transparent px-4 hover:bg-white hover:text-ink sm:px-7"
            >
              Skin quiz
            </Button>
          </div>
        </div>
        {hasVideo ? (
          <div className="absolute inset-0 -z-10 md:relative md:inset-auto md:z-auto md:flex md:justify-center">
            <AmbientVideo
              src={HERO_VIDEO.src}
              loopEnd={HERO_VIDEO.loopEnd}
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
