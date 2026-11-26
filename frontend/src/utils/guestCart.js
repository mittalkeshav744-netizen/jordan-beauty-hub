const STORAGE_KEY = 'jbh:guest-cart'

function emptyCart() {
  return { items: [], item_count: 0, subtotal: '0.00' }
}

function money(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0.00'
  return amount.toFixed(2)
}

function lineTotal(price, quantity) {
  return money(Number(price) * Number(quantity))
}

function buildCart(lines) {
  const items = lines.map((line) => {
    const snapshot = line.snapshot || {}
    const quantity = Math.max(1, Number(line.quantity) || 1)
    const price = snapshot.price ?? '0.00'
    return {
      id: `guest-${line.variantId}`,
      quantity,
      line_total: lineTotal(price, quantity),
      variant: {
        id: line.variantId,
        name: snapshot.name || 'Option',
        sku: snapshot.sku || '',
        price: money(price),
        compare_at_price: snapshot.compare_at_price ?? null,
        stock_quantity: snapshot.stock_quantity ?? 99,
        product_name: snapshot.product_name || 'Product',
        product_slug: snapshot.product_slug || '',
        brand_name: snapshot.brand_name || '',
        image: snapshot.image || null,
        is_available: snapshot.is_available !== false,
      },
    }
  })
  const item_count = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = money(items.reduce((sum, item) => sum + Number(item.line_total), 0))
  return { items, item_count, subtotal }
}

function readLines() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .map((row) => ({
        variantId: Number(row.variantId),
        quantity: Math.max(1, Number(row.quantity) || 1),
        snapshot: row.snapshot && typeof row.snapshot === 'object' ? row.snapshot : {},
      }))
      .filter((row) => Number.isInteger(row.variantId) && row.variantId > 0)
  } catch {
    return []
  }
}

function writeLines(lines) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  } catch {
    // Private browsing / full storage — skip persist.
  }
}

export function getGuestCart() {
  const lines = readLines()
  return lines.length ? buildCart(lines) : emptyCart()
}

export function addGuestCartItem(variantId, quantity = 1, snapshot = {}) {
  const id = Number(variantId)
  const qty = Math.max(1, Number(quantity) || 1)
  const lines = readLines()
  const existing = lines.find((line) => line.variantId === id)
  if (existing) {
    existing.quantity += qty
    if (snapshot && Object.keys(snapshot).length) existing.snapshot = { ...existing.snapshot, ...snapshot }
  } else {
    lines.push({ variantId: id, quantity: qty, snapshot: snapshot || {} })
  }
  writeLines(lines)
  return buildCart(lines)
}

export function updateGuestCartItem(itemId, quantity) {
  const variantId = Number(String(itemId).replace(/^guest-/, ''))
  const qty = Math.max(1, Number(quantity) || 1)
  const lines = readLines()
    .map((line) => (line.variantId === variantId ? { ...line, quantity: qty } : line))
  writeLines(lines)
  return buildCart(lines)
}

export function removeGuestCartItem(itemId) {
  const variantId = Number(String(itemId).replace(/^guest-/, ''))
  const lines = readLines().filter((line) => line.variantId !== variantId)
  writeLines(lines)
  return buildCart(lines)
}

export function getGuestCartLines() {
  return readLines()
}

export function clearGuestCart() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
