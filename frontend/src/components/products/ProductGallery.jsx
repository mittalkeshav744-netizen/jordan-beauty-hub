import { useState } from 'react'

import ProductImage from '../common/ProductImage'

const ARROW_CLASSES =
  'absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 shadow-card hover:bg-surface'

export default function ProductGallery({ images, productName }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedImage = images[selectedIndex]
  const hasMultiple = images.length > 1

  const showImage = (index) => setSelectedIndex((index + images.length) % images.length)

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-card border border-line bg-subtle">
        <ProductImage
          src={selectedImage?.image}
          alt={selectedImage?.alt_text || productName}
          loading="eager"
          className="h-full w-full"
        />
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => showImage(selectedIndex - 1)}
              aria-label="Previous image"
              className={`${ARROW_CLASSES} left-2`}
            >
              <span aria-hidden="true" className="text-xl leading-none">‹</span>
            </button>
            <button
              type="button"
              onClick={() => showImage(selectedIndex + 1)}
              aria-label="Next image"
              className={`${ARROW_CLASSES} right-2`}
            >
              <span aria-hidden="true" className="text-xl leading-none">›</span>
            </button>
            <p className="absolute right-3 bottom-3 rounded-control bg-ink/70 px-2 py-0.5 text-xs text-white">
              {selectedIndex + 1} / {images.length}
            </p>
          </>
        )}
      </div>
      {hasMultiple && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Product images">
          {images.map((image, index) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`Show image ${index + 1}`}
                aria-current={index === selectedIndex ? 'true' : undefined}
                className={`h-16 w-16 overflow-hidden rounded-control border-2 sm:h-20 sm:w-20 ${
                  index === selectedIndex ? 'border-ink' : 'border-transparent hover:border-line'
                }`}
              >
                <ProductImage src={image.image} alt="" className="h-full w-full" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
