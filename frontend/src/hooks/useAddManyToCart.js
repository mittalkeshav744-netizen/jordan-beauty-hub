import { useState } from 'react'

import { getErrorMessage } from '../utils/errors'
import { useCart } from './useCart'
import { useToast } from './useToast'

/**
 * Add several variants (one of each) to the bag, e.g. a whole routine or look.
 * Works for guests (local bag) and signed-in shoppers (server bag).
 */
export function useAddManyToCart() {
  const { addItem } = useCart()
  const { showToast } = useToast()
  const [isAdding, setIsAdding] = useState(false)

  const addMany = async (variantIds, label, snapshotsById = null) => {
    setIsAdding(true)
    let added = 0
    try {
      for (const variantId of variantIds) {
        const snapshot = snapshotsById?.[variantId] || null
        await addItem(variantId, 1, snapshot)
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
