import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PackingSlipDocument from '../components/manage/packaging/PackingSlipDocument'
import {
  formatShippingBlock,
  normalizeOrderForPackaging,
  packText,
  totalUnits,
} from './packagingOrder'

const sampleOrder = {
  number: 'JB-1001',
  created_at: '2026-03-01T10:00:00Z',
  customer_name: 'Asha Rao',
  customer_note: 'Leave at reception',
  grand_total: '2499.00',
  shipping_address: {
    full_name: 'Asha Rao',
    phone: '9876543210',
    line1: '12 MG Road',
    line2: '',
    city: 'Bengaluru',
    state: 'KA',
    postal_code: '560001',
    country: 'IN',
  },
  items: [
    {
      id: 1,
      product_name: 'Rose Mist',
      sku: 'RM-01',
      variant_name: '100ml',
      quantity: 2,
      unit_price: '499.00',
      line_total: '998.00',
    },
    {
      id: 2,
      product_name: 'Glow Serum',
      sku: 'GS-02',
      variant_name: '30ml',
      quantity: 1,
      unit_price: '1501.00',
      line_total: '1501.00',
    },
  ],
}

describe('packagingOrder helpers', () => {
  it('packText trims and falls back', () => {
    expect(packText('  hello  ')).toBe('hello')
    expect(packText('', '—')).toBe('—')
    expect(packText(null)).toBe('—')
  })

  it('normalizeOrderForPackaging maps fields without prices', () => {
    const pack = normalizeOrderForPackaging(sampleOrder)
    expect(pack.number).toBe('JB-1001')
    expect(pack.customerName).toBe('Asha Rao')
    expect(pack.phone).toBe('9876543210')
    expect(pack.items).toHaveLength(2)
    expect(pack.items[0]).toMatchObject({
      productName: 'Rose Mist',
      sku: 'RM-01',
      variantName: '100ml',
      quantity: 2,
      serial: 1,
    })
    expect(JSON.stringify(pack)).not.toMatch(/2499|499|998|1501|unit_price|line_total|grand_total/)
  })

  it('totalUnits sums quantities', () => {
    const pack = normalizeOrderForPackaging(sampleOrder)
    expect(totalUnits(pack.items)).toBe(3)
    expect(totalUnits([])).toBe(0)
  })

  it('formatShippingBlock builds address lines', () => {
    const pack = normalizeOrderForPackaging(sampleOrder)
    expect(formatShippingBlock(pack)).toEqual(['12 MG Road', 'Bengaluru, KA, 560001', 'IN'])
  })

  it('handles missing order data safely', () => {
    const pack = normalizeOrderForPackaging(null)
    expect(pack.number).toBe('Unknown order')
    expect(pack.customerName).toBe('Customer')
    expect(pack.items).toEqual([])
  })
})

describe('PackingSlipDocument', () => {
  it('renders slip content without any prices', () => {
    const { container } = render(<PackingSlipDocument order={sampleOrder} />)
    expect(screen.getByLabelText(/packing slip for jb-1001/i)).toBeInTheDocument()
    expect(screen.getByText('Rose Mist')).toBeInTheDocument()
    expect(screen.getByText('Total units to pack: 3')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/₹|2499|499\.00|998|1501|grand_total|unit_price/)
  })
})
