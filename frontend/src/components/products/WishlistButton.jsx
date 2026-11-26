import { useState } from 'react'

import { useToast } from '../../hooks/useToast'
import { useWishlist } from '../../hooks/useWishlist'
import { getErrorMessage } from '../../utils/errors'

export const HEART_PATH =
  'M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.9 3.6 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.5 3.4 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4Z'

function HeartIcon({ filled }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 transition-[fill,stroke,transform,color] duration-200 ease-standard"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d={HEART_PATH} />
    </svg>
  )
}

const VARIANT_CLASSES = {
  icon:
    'h-10 w-10 rounded-full bg-surface/90 text-ink shadow-card backdrop-blur transition-[color,background-color,transform,box-shadow] duration-200 ease-standard hover:scale-105 hover:bg-accent-soft hover:text-accent hover:shadow-raised focus-visible:bg-accent-soft focus-visible:text-accent',
  full:
    'h-12 w-full gap-2 rounded-control border border-ink px-5 text-sm font-semibold tracking-wide uppercase transition-colors duration-200 ease-standard hover:border-accent hover:bg-accent-soft hover:text-accent',
}

/**
 * Heart toggle that saves a product to the wishlist. Guests save in this browser;
 * signed-in shoppers sync to the server. `variant="icon"` floats over product images.
 */
export default function WishlistButton({ product, variant = 'icon', className = '' }) {
  const { isSaved, addToWishlist, removeFromWishlist } = useWishlist()
  const { showToast } = useToast()
  const [isPending, setIsPending] = useState(false)
  const saved = isSaved(product.id)

  const toggle = async () => {
    setIsPending(true)
    try {
      if (saved) {
        await removeFromWishlist(product.id)
        showToast(`${product.name} removed from your wishlist.`, 'info')
      } else {
        await addToWishlist(product.id)
        showToast(`${product.name} saved to your wishlist.`)
      }
    } catch (error) {
      showToast(getErrorMessage(error), 'error')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={variant === 'icon' ? saved : undefined}
      aria-label={variant === 'icon' ? `Save ${product.name} to wishlist` : undefined}
      className={`inline-flex shrink-0 items-center justify-center disabled:opacity-60 ${
        saved ? 'text-accent' : ''
      } ${VARIANT_CLASSES[variant]} ${className}`}
    >
      <HeartIcon filled={saved} />
      {variant === 'full' && (saved ? 'Saved to wishlist' : 'Save to wishlist')}
    </button>
  )
}
