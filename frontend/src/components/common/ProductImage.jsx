import { STORE_NAME } from '../../constants/navigation'

/**
 * Product photo with a neutral branded placeholder when no image has been
 * uploaded yet in Django Admin.
 */
export default function ProductImage({ src, alt, className = '', loading = 'lazy' }) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt ? `${alt} — image coming soon` : 'Image coming soon'}
        className={`flex items-center justify-center bg-subtle text-center ${className}`}
      >
        <span className="px-2 text-[0.65rem] font-semibold tracking-[0.2em] text-muted uppercase">
          {STORE_NAME}
        </span>
      </div>
    )
  }
  return (
    <img src={src} alt={alt} loading={loading} decoding="async" className={`object-cover ${className}`} />
  )
}
