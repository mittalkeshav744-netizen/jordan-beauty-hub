import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useAuth } from '../../hooks/useAuth'
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
      className="h-5 w-5"
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
    'h-10 w-10 rounded-full bg-surface/90 shadow-card backdrop-blur hover:bg-surface',
  full:
    'h-12 w-full gap-2 rounded-control border border-ink px-5 text-sm font-semibold tracking-wide uppercase hover:bg-subtle',
}

/**
 * Heart toggle that saves a product to the wishlist. `variant="icon"` floats over product
 * images; `variant="full"` is a labelled button for the product page.
 */
export default function WishlistButton({ product, variant = 'icon', className = '' }) {
  const { isAuthenticated } = useAuth()
  const { isSaved, addToWishlist, removeFromWishlist } = useWishlist()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [isPending, setIsPending] = useState(false)
  const saved = isSaved(product.id)

  const toggle = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to save products to your wishlist.', 'info')
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }
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
      className={`inline-flex shrink-0 items-center justify-center transition-colors duration-200 ease-standard disabled:opacity-60 ${
        saved ? 'text-accent' : 'text-ink'
      } ${VARIANT_CLASSES[variant]} ${className}`}
    >
      <HeartIcon filled={saved} />
      {variant === 'full' && (saved ? 'Saved to wishlist' : 'Save to wishlist')}
    </button>
  )
}
