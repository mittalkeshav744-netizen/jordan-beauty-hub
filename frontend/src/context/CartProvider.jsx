import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../hooks/useAuth'
import { cartService } from '../services/cartService'
import {
  addGuestCartItem,
  clearGuestCart,
  getGuestCart,
  getGuestCartLines,
  removeGuestCartItem,
  updateGuestCartItem,
} from '../utils/guestCart'
import { CartContext } from './contexts'

const EMPTY_CART = { items: [], item_count: 0, subtotal: '0.00' }

/** Bag lives on the server when signed in; guests keep a browser localStorage bag. */
export default function CartProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState({ ownerId: null, cart: EMPTY_CART, error: null })

  useEffect(() => {
    if (userId) return undefined
    setState({ ownerId: null, cart: getGuestCart(), error: null })
    return undefined
  }, [userId])

  useEffect(() => {
    if (!userId) return undefined
    let isCurrent = true

    const sync = async () => {
      const guestLines = getGuestCartLines()
      try {
        for (const line of guestLines) {
          try {
            await cartService.addItem(line.variantId, line.quantity)
          } catch {
            // Skip unavailable lines; continue merging.
          }
        }
        if (guestLines.length) clearGuestCart()
        const cart = await cartService.get()
        if (isCurrent) setState({ ownerId: userId, cart, error: null })
      } catch (error) {
        if (isCurrent) setState({ ownerId: userId, cart: EMPTY_CART, error })
      }
    }

    sync()
    return () => {
      isCurrent = false
    }
  }, [userId])

  const hasCurrentCart = userId ? state.ownerId === userId : state.ownerId === null
  const cart = hasCurrentCart ? state.cart : EMPTY_CART
  const isLoading = Boolean(userId) && state.ownerId !== userId

  const storeCart = useCallback(
    (nextCart) => setState({ ownerId: userId ?? null, cart: nextCart, error: null }),
    [userId],
  )

  const refreshCart = useCallback(async () => {
    if (!userId) {
      storeCart(getGuestCart())
      return
    }
    try {
      storeCart(await cartService.get())
    } catch (error) {
      setState((current) => ({ ...current, error }))
    }
  }, [storeCart, userId])

  const addItem = useCallback(
    async (variantId, quantity = 1, snapshot = null) => {
      if (!userId) {
        return storeCart(addGuestCartItem(variantId, quantity, snapshot || {}))
      }
      try {
        return storeCart(await cartService.addItem(variantId, quantity))
      } catch (error) {
        setState((current) => ({ ...current, error }))
        throw error
      }
    },
    [storeCart, userId],
  )

  const updateItem = useCallback(
    async (itemId, quantity) => {
      if (!userId) {
        return storeCart(updateGuestCartItem(itemId, quantity))
      }
      try {
        return storeCart(await cartService.updateItem(itemId, quantity))
      } catch (error) {
        setState((current) => ({ ...current, error }))
        throw error
      }
    },
    [storeCart, userId],
  )

  const removeItem = useCallback(
    async (itemId) => {
      if (!userId) {
        return storeCart(removeGuestCartItem(itemId))
      }
      try {
        return storeCart(await cartService.removeItem(itemId))
      } catch (error) {
        setState((current) => ({ ...current, error }))
        throw error
      }
    },
    [storeCart, userId],
  )

  const clearLocalCart = useCallback(() => {
    if (!userId) clearGuestCart()
    return storeCart(EMPTY_CART)
  }, [storeCart, userId])

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
