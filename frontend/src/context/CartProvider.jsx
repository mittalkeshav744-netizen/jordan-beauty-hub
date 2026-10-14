import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../hooks/useAuth'
import { cartService } from '../services/cartService'
import { CartContext } from './contexts'

const EMPTY_CART = { items: [], item_count: 0, subtotal: '0.00' }

/** The cart lives on the server; this provider keeps the latest copy for the UI. */
export default function CartProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  // ownerId records which user the stored cart belongs to, so a cart is never
  // shown to the wrong account after signing out or switching users.
  const [state, setState] = useState({ ownerId: null, cart: EMPTY_CART, error: null })

  useEffect(() => {
    if (!userId) return undefined
    let isCurrent = true
    cartService.get().then(
      (cart) => isCurrent && setState({ ownerId: userId, cart, error: null }),
      (error) => isCurrent && setState({ ownerId: userId, cart: EMPTY_CART, error }),
    )
    return () => {
      isCurrent = false
    }
  }, [userId])

  const hasCurrentCart = Boolean(userId) && state.ownerId === userId
  const cart = hasCurrentCart ? state.cart : EMPTY_CART
  const isLoading = Boolean(userId) && !hasCurrentCart

  const storeCart = useCallback((nextCart) => setState({ ownerId: userId, cart: nextCart, error: null }), [userId])

  const refreshCart = useCallback(async () => {
    try {
      storeCart(await cartService.get())
    } catch (error) {
      setState((current) => ({ ...current, error }))
    }
  }, [storeCart])

  const addItem = useCallback(
    async (variantId, quantity = 1) => storeCart(await cartService.addItem(variantId, quantity)),
    [storeCart],
  )
  const updateItem = useCallback(
    async (itemId, quantity) => storeCart(await cartService.updateItem(itemId, quantity)),
    [storeCart],
  )
  const removeItem = useCallback(
    async (itemId) => storeCart(await cartService.removeItem(itemId)),
    [storeCart],
  )
  const clearLocalCart = useCallback(() => storeCart(EMPTY_CART), [storeCart])

  const value = useMemo(
    () => ({
      cart,
      isLoading,
      error: hasCurrentCart ? state.error : null,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
      clearLocalCart,
    }),
    [cart, isLoading, hasCurrentCart, state.error, refreshCart, addItem, updateItem, removeItem, clearLocalCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
