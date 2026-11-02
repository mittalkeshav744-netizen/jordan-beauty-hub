/** Safe display value for packing documents. */
export function packText(value, fallback = '—') {
  const text = String(value ?? '').trim()
  return text || fallback
}

/** Normalize portal order detail into packaging-friendly fields (no prices). */
export function normalizeOrderForPackaging(order) {
  const address = order?.shipping_address || {}
  const items = Array.isArray(order?.items) ? order.items : []

  return {
    number: packText(order?.number, 'Unknown order'),
    createdAt: order?.created_at || null,
    customerNote: packText(order?.customer_note, ''),
    customerName: packText(address.full_name || order?.customer_name, 'Customer'),
    phone: packText(address.phone, ''),
    line1: packText(address.line1, ''),
    line2: packText(address.line2, ''),
    city: packText(address.city, ''),
    state: packText(address.state, ''),
    postalCode: packText(address.postal_code, ''),
    country: packText(address.country, ''),
    items: items.map((item, index) => ({
      id: item.id ?? index,
      serial: index + 1,
      productName: packText(item.product_name, 'Product'),
      sku: packText(item.sku, '—'),
      variantName: packText(item.variant_name, '—'),
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 0,
    })),
  }
}

export function totalUnits(items) {
  return (items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
}

export function formatShippingBlock(order) {
  const lines = [order.line1, order.line2].filter((line) => line && line !== '—')
  const cityLine = [order.city, order.state, order.postalCode]
    .filter((part) => part && part !== '—')
    .join(', ')
  if (cityLine) lines.push(cityLine)
  if (order.country && order.country !== '—') lines.push(order.country)
  return lines
}
