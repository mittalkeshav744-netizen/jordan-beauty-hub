import { useContext } from 'react'

import { WishlistContext } from '../context/contexts'

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used inside <WishlistProvider>')
  return context
}
