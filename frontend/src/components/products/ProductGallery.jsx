import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import ProductImage from '../common/ProductImage'

const ARROW_CLASSES =
  'absolute top-1/2 z-[2] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 shadow-card hover:bg-surface'

const ZOOM_SCALE = 2.4

function ZoomIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M16 16l5 5" strokeLinecap="round" />
      <path d="M10.5 7.5v6M7.5 10.5h6" strokeLinecap="round" />
    </svg>
  )
}

function GalleryLightbox({
  images,
  productName,
  index,
  onClose,
  onShow,
}) {
  const titleId = useId()
  const closeRef = useRef(null)
  const selected = images[index]
  const hasMultiple = images.length > 1
  const alt = selected?.alt_text || productName

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus({ preventScroll: true })

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft' && hasMultiple) {
        event.preventDefault()
        onShow(index - 1)
      } else if (event.key === 'ArrowRight' && hasMultiple) {
        event.preventDefault()
        onShow(index + 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [hasMultiple, index, onClose, onShow])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-ink/92 text-white">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <p id={titleId} className="min-w-0 truncate text-sm font-medium">
          {productName}
          {hasMultiple ? (
            <span className="ml-2 text-white/70">
              {index + 1} / {images.length}
            </span>
          ) : null}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close zoomed image"
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-btn border border-white/25 bg-white/10 px-3 text-sm font-semibold hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Close
        </button>
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-6 sm:px-8"
      >
        <button
          type="button"
          aria-label="Close zoomed image backdrop"
          className="absolute inset-0 cursor-zoom-out"
          onClick={onClose}
        />

        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onShow(index - 1)
              }}
              aria-label="Previous image"
              className="absolute top-1/2 left-2 z-[1] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl hover:bg-white/25 sm:left-4"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onShow(index + 1)
              }}
              aria-label="Next image"
              className="absolute top-1/2 right-2 z-[1] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl hover:bg-white/25 sm:right-4"
            >
              <span aria-hidden="true">›</span>
            </button>
          </>
        ) : null}

        <div
          className="relative z-[1] max-h-full max-w-full overflow-hidden rounded-card bg-subtle shadow-raised"
          onClick={(event) => event.stopPropagation()}
        >
          <ProductImage
            src={selected?.image}
            alt={alt}
            loading="eager"
            className="!max-h-[min(82dvh,56rem)] !max-w-[min(100vw-1.5rem,56rem)] !h-auto !w-auto !object-contain"
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function ProductGallery({ images = [], productName }) {
  const list = Array.isArray(images) ? images : []
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const frameRef = useRef(null)

  const safeIndex = list.length ? Math.min(selectedIndex, list.length - 1) : 0
  const selectedImage = list[safeIndex]
  const hasMultiple = list.length > 1
  const canZoom = Boolean(selectedImage?.image)

  const showImage = (index) => {
    if (!list.length) return
    setSelectedIndex((index + list.length) % list.length)
  }

  const updateOrigin = (event) => {
    const frame = frameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setOrigin({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={frameRef}
        className="relative aspect-square overflow-hidden rounded-card border border-line bg-subtle"
      >
        <button
          type="button"
          disabled={!canZoom}
          onClick={() => {
            if (!canZoom) return
            setHovering(false)
            setLightboxOpen(true)
          }}
          onMouseEnter={() => canZoom && setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onMouseMove={canZoom ? updateOrigin : undefined}
          aria-label={canZoom ? `Zoom ${productName} image` : productName}
          className={`relative block h-full w-full overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
            canZoom ? 'cursor-zoom-in' : 'cursor-default'
          }`}
        >
          <ProductImage
            src={selectedImage?.image}
            alt={selectedImage?.alt_text || productName}
            loading="eager"
            className={`h-full w-full transition-transform duration-150 ease-out motion-reduce:transition-none ${
              hovering && canZoom ? 'scale-[var(--gallery-zoom)]' : 'scale-100'
            }`}
            style={
              hovering && canZoom
                ? {
                    '--gallery-zoom': String(ZOOM_SCALE),
                    transformOrigin: `${origin.x}% ${origin.y}%`,
                  }
                : undefined
            }
          />
        </button>

        {canZoom ? (
          <p className="pointer-events-none absolute top-3 right-3 z-[2] inline-flex items-center gap-1.5 rounded-control bg-ink/70 px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-white uppercase">
            <ZoomIcon className="h-3.5 w-3.5" />
            Zoom
          </p>
        ) : null}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => showImage(safeIndex - 1)}
              aria-label="Previous image"
              className={`${ARROW_CLASSES} left-2`}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ‹
              </span>
            </button>
            <button
              type="button"
              onClick={() => showImage(safeIndex + 1)}
              aria-label="Next image"
              className={`${ARROW_CLASSES} right-2`}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ›
              </span>
            </button>
            <p className="absolute right-3 bottom-3 z-[2] rounded-control bg-ink/70 px-2 py-0.5 text-xs text-white">
              {safeIndex + 1} / {list.length}
            </p>
          </>
        )}
      </div>

      {hasMultiple && (
        <ul className="scrollbar-hide flex gap-2 overflow-x-auto pb-1" aria-label="Product images">
          {list.map((image, index) => (
            <li key={image.id ?? index} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`Show image ${index + 1}`}
                aria-current={index === safeIndex ? 'true' : undefined}
                className={`h-16 w-16 overflow-hidden rounded-control border-2 sm:h-20 sm:w-20 ${
                  index === safeIndex ? 'border-ink' : 'border-transparent hover:border-line'
                }`}
              >
                <ProductImage src={image.image} alt="" className="h-full w-full" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {lightboxOpen && canZoom ? (
        <GalleryLightbox
          images={list}
          productName={productName}
          index={safeIndex}
          onClose={() => setLightboxOpen(false)}
          onShow={showImage}
        />
      ) : null}
    </div>
  )
}
