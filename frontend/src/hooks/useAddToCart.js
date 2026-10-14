import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { getErrorMessage } from '../utils/errors'
import { useAuth } from './useAuth'
import { useCart } from './useCart'
import { useToast } from './useToast'

/** Add a variant to the bag, sending signed-out visitors to the sign-in page first. */
export function useAddToCart() {
  const { isAuthenticated } = useAuth()
  const { addItem } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [pendingVariantId, setPendingVariantId] = useState(null)

  const addToCart = async (variantId, quantity = 1, productName = 'Item') => {
    if (!isAuthenticated) {
      showToast('Please sign in to add items to your bag.', 'info')
      navigate('/login', { state: { from: location.pathname + location.search } })
      return false
    }
    setPendingVariantId(variantId)
    try {
      await addItem(variantId, quantity)
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
