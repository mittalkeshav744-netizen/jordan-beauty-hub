import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../hooks/useAuth'
import { wishlistService } from '../services/wishlistService'
import { WishlistContext } from './contexts'

const EMPTY_WISHLIST = { products: [], product_ids: [] }

/** Saved products live on the server; this provider keeps the latest copy for the UI. */
export default function WishlistProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  // ownerId records which user the stored list belongs to, so it is never shown to another account.
  const [state, setState] = useState({ ownerId: null, wishlist: EMPTY_WISHLIST, error: null })

  useEffect(() => {
    if (!userId) return undefined
    let isCurrent = true
    wishlistService.get().then(
      (wishlist) => isCurrent && setState({ ownerId: userId, wishlist, error: null }),
      (error) => isCurrent && setState({ ownerId: userId, wishlist: EMPTY_WISHLIST, error }),
    )
    return () => {
      isCurrent = false
    }
  }, [userId])

  const hasCurrentList = Boolean(userId) && state.ownerId === userId
  const wishlist = hasCurrentList ? state.wishlist : EMPTY_WISHLIST
  const isLoading = Boolean(userId) && !hasCurrentList

  const storeWishlist = useCallback((next) => setState({ ownerId: userId, wishlist: next, error: null }), [userId])

  const refreshWishlist = useCallback(async () => {
    try {
      storeWishlist(await wishlistService.get())
    } catch (error) {
      setState((current) => ({ ...current, error }))
    }
  }, [storeWishlist])

  const addToWishlist = useCallback(
    async (productId) => storeWishlist(await wishlistService.add(productId)),
    [storeWishlist],
  )
  const removeFromWishlist = useCallback(
    async (productId) => storeWishlist(await wishlistService.remove(productId)),
    [storeWishlist],
  )

  const savedIds = useMemo(() => new Set(wishlist.product_ids), [wishlist.product_ids])
  const isSaved = useCallback((productId) => savedIds.has(productId), [savedIds])

  const value = useMemo(
    () => ({
      products: wishlist.products,
      count: wishlist.product_ids.length,
      isLoading,
      error: hasCurrentList ? state.error : null,
      isSaved,
      refreshWishlist,
      addToWishlist,
      removeFromWishlist,
    }),
    [wishlist, isLoading, hasCurrentList, state.error, isSaved, refreshWishlist, addToWishlist, removeFromWishlist],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}
