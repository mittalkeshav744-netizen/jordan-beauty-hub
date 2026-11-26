const STORAGE_KEY = 'jbh:guest-wishlist'
const MAX_ITEMS = 60

function readIds() {
  try {
    const ids = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(ids) ? ids.map(Number).filter((id) => Number.isInteger(id) && id > 0) : []
  } catch {
    return []
  }
}

function writeIds(ids) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_ITEMS)))
  } catch {
    // Private browsing / full storage — skip persist.
  }
}

/** Product ids saved while signed out (this browser only). */
export function getGuestWishlistIds() {
  return readIds()
}

export function setGuestWishlistIds(ids) {
  writeIds([...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))])
}

export function addGuestWishlistId(productId) {
  const id = Number(productId)
  const next = [id, ...readIds().filter((item) => item !== id)]
  writeIds(next)
  return next
}

export function removeGuestWishlistId(productId) {
  const id = Number(productId)
  const next = readIds().filter((item) => item !== id)
  writeIds(next)
  return next
}

export function clearGuestWishlist() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
