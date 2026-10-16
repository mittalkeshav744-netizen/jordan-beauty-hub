const STORAGE_KEY = 'jbh:recently-viewed'
const MAX_ITEMS = 8

/** Product ids the visitor opened, newest first. Stored only in this browser. */
export function getRecentlyViewedIds() {
  try {
    const ids = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(ids) ? ids.filter(Number.isInteger).slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

export function rememberViewedProduct(productId) {
  const ids = [productId, ...getRecentlyViewedIds().filter((id) => id !== productId)].slice(0, MAX_ITEMS)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Private browsing or full storage: the shelf simply stays empty.
  }
}
