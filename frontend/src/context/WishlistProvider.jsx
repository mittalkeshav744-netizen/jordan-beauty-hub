import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../hooks/useAuth'
import { catalogService } from '../services/catalogService'
import { wishlistService } from '../services/wishlistService'
import {
  addGuestWishlistId,
  clearGuestWishlist,
  getGuestWishlistIds,
  removeGuestWishlistId,
  setGuestWishlistIds,
} from '../utils/guestWishlist'
import { WishlistContext } from './contexts'

const EMPTY_WISHLIST = { products: [], product_ids: [] }

async function loadGuestWishlistProducts(ids) {
  if (!ids.length) return EMPTY_WISHLIST
  const data = await catalogService.getProducts({ ids: ids.join(','), page_size: ids.length })
  const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
  const byId = new Map(results.map((product) => [product.id, product]))
  const products = ids.map((id) => byId.get(id)).filter(Boolean)
  return { products, product_ids: products.map((product) => product.id) }
}

/** Saved products: server when signed in, browser localStorage when signed out. */
export default function WishlistProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState({ ownerId: null, wishlist: EMPTY_WISHLIST, error: null })
  const [guestTick, setGuestTick] = useState(0)

  useEffect(() => {
    if (userId) return undefined
    let isCurrent = true
    const ids = getGuestWishlistIds()
    loadGuestWishlistProducts(ids).then(
      (wishlist) => {
        if (!isCurrent) return
        setState({ ownerId: null, wishlist, error: null })
      },
      (error) => {
        if (!isCurrent) return
        setState({ ownerId: null, wishlist: { products: [], product_ids: ids }, error })
      },
    )
    return () => {
      isCurrent = false
    }
  }, [userId, guestTick])

  useEffect(() => {
    if (!userId) return undefined
    let isCurrent = true

    const sync = async () => {
      const guestIds = getGuestWishlistIds()
      try {
        for (const productId of guestIds) {
          try {
            await wishlistService.add(productId)
          } catch {
            // Skip ids that no longer exist; continue merging the rest.
          }
        }
        if (guestIds.length) clearGuestWishlist()
        const wishlist = await wishlistService.get()
        if (isCurrent) setState({ ownerId: userId, wishlist, error: null })
      } catch (error) {
        if (isCurrent) setState({ ownerId: userId, wishlist: EMPTY_WISHLIST, error })
      }
    }

    sync()
    return () => {
      isCurrent = false
    }
  }, [userId])

  const hasCurrentList = userId ? state.ownerId === userId : state.ownerId === null
  const wishlist = hasCurrentList ? state.wishlist : EMPTY_WISHLIST
  const isLoading = userId ? state.ownerId !== userId : false

  const storeWishlist = useCallback(
    (next) => setState({ ownerId: userId, wishlist: next, error: null }),
    [userId],
  )

  const refreshWishlist = useCallback(async () => {
    if (!userId) {
      setGuestTick((tick) => tick + 1)
      return
    }
    try {
      storeWishlist(await wishlistService.get())
    } catch (error) {
      setState((current) => ({ ...current, error }))
    }
  }, [storeWishlist, userId])

  const addToWishlist = useCallback(
    async (productId) => {
      if (!userId) {
        const product_ids = addGuestWishlistId(productId)
        setGuestWishlistIds(product_ids)
        setGuestTick((tick) => tick + 1)
        return { products: [], product_ids }
      }
      return storeWishlist(await wishlistService.add(productId))
    },
    [storeWishlist, userId],
  )

  const removeFromWishlist = useCallback(
    async (productId) => {
      if (!userId) {
        const product_ids = removeGuestWishlistId(productId)
        setGuestWishlistIds(product_ids)
        setGuestTick((tick) => tick + 1)
        return { products: [], product_ids }
      }
      return storeWishlist(await wishlistService.remove(productId))
    },
    [storeWishlist, userId],
  )

  const savedIds = useMemo(() => {
    if (userId && state.ownerId === userId) return new Set(wishlist.product_ids)
    if (!userId) return new Set(getGuestWishlistIds())
    return new Set()
  }, [userId, state.ownerId, wishlist.product_ids, guestTick])

  const isSaved = useCallback((productId) => savedIds.has(productId), [savedIds])

  const value = useMemo(
    () => ({
      products: wishlist.products,
      count: savedIds.size,
      isLoading,
      error: hasCurrentList ? state.error : null,
      isSaved,
      refreshWishlist,
      addToWishlist,
      removeFromWishlist,
    }),
    [
      wishlist.products,
      savedIds,
      isLoading,
      hasCurrentList,
      state.error,
      isSaved,
      refreshWishlist,
      addToWishlist,
      removeFromWishlist,
    ],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}
