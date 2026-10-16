import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'

import { looksService } from '../services/looksService'
import { renderWithProviders } from '../test/renderWithProviders'
import LookDetailPage from './LookDetailPage'

vi.mock('../services/looksService', () => ({
  looksService: { list: vi.fn(), get: vi.fn() },
}))

const LOOK = {
  slug: 'festive-glam',
  title: 'Festive glam',
  occasion: 'Festive',
  description: 'Bold lips and a glowing base.',
  cover_image: null,
  video: null,
  steps: [
    {
      id: 1,
      instruction: 'Line and fill the lips.',
      product: { id: 5, name: 'Matte Velvet Lipstick', slug: 'matte-velvet-lipstick', primary_image: null, min_price: '699.00' },
      variant: { id: 21, name: 'Ruby Red', price: '749.00', shade_hex: '#9b111e', is_in_stock: true },
    },
  ],
  bag_variant_ids: [21],
  total_price: '749.00',
}

function renderLook(options) {
  return renderWithProviders(
    <Routes>
      <Route path="/looks/:slug" element={<LookDetailPage />} />
    </Routes>,
    { route: '/looks/festive-glam', ...options },
  )
}

describe('LookDetailPage', () => {
  it('shows the steps with shade, instruction and the server total', async () => {
    looksService.get.mockResolvedValue(LOOK)
    renderLook()

    expect(await screen.findByRole('heading', { level: 1, name: 'Festive glam' })).toBeInTheDocument()
    expect(looksService.get).toHaveBeenCalledWith('festive-glam')
    expect(screen.getByText('Shade: Ruby Red — Line and fill the lips.')).toBeInTheDocument()
    expect(screen.getAllByText('₹749')).toHaveLength(2)
  })

  it('adds the full look to the bag', async () => {
    const user = userEvent.setup()
    looksService.get.mockResolvedValue(LOOK)
    const { cartValue } = renderLook({ auth: { isAuthenticated: true } })

    await user.click(await screen.findByRole('button', { name: /add the full look to bag/i }))
    expect(cartValue.addItem).toHaveBeenCalledWith(21, 1)
  })

  it('shows the not found page for an unknown look', async () => {
    looksService.get.mockRejectedValue({ response: { status: 404, data: {} } })
    renderLook()

    expect(await screen.findByRole('heading', { name: /not found/i })).toBeInTheDocument()
  })
})
