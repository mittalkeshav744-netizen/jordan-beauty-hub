import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { getErrorMessage } from '../utils/errors'
import { useAuth } from './useAuth'
import { useCart } from './useCart'
import { useToast } from './useToast'

/**
 * Add several variants (one of each) to the bag, e.g. a whole routine or look.
 * Signed-out visitors are sent to sign in and brought back to this page afterwards.
 */
export function useAddManyToCart() {
  const { isAuthenticated } = useAuth()
  const { addItem } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [isAdding, setIsAdding] = useState(false)

  const addMany = async (variantIds, label) => {
    if (!isAuthenticated) {
      showToast('Please sign in to add items to your bag.', 'info')
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }
    setIsAdding(true)
    let added = 0
    try {
      for (const variantId of variantIds) {
        await addItem(variantId, 1)
        added += 1
      }
      showToast(`${label} added to your bag (${added} item${added === 1 ? '' : 's'}).`)
    } catch (error) {
      const prefix = added ? `${added} item${added === 1 ? ' was' : 's were'} added, then: ` : ''
      showToast(prefix + getErrorMessage(error), 'error')
    } finally {
      setIsAdding(false)
    }
  }

  return { addMany, isAdding }
}
