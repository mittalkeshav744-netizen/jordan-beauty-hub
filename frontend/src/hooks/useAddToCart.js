import { useState } from 'react'

import { getErrorMessage } from '../utils/errors'
import { useCart } from './useCart'
import { useToast } from './useToast'

/** Add a variant to the bag. Guests keep items in this browser until checkout (sign-in). */
export function useAddToCart() {
  const { addItem } = useCart()
  const { showToast } = useToast()
  const [pendingVariantId, setPendingVariantId] = useState(null)

  const addToCart = async (variantId, quantity = 1, productName = 'Item', snapshot = null) => {
    if (!variantId) {
      showToast('This product is unavailable right now.', 'error')
      return false
    }
    setPendingVariantId(variantId)
    try {
      await addItem(variantId, quantity, snapshot)
      showToast(`${productName} added to your bag.`)
      return true
    } catch (error) {
      showToast(getErrorMessage(error), 'error')
      return false
    } finally {
      setPendingVariantId(null)
    }
  }

  return { addToCart, pendingVariantId }
}
