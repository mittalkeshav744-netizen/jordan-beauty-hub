import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'

import { catalogService } from '../../services/catalogService'
import { renderWithProviders } from '../../test/renderWithProviders'
import SearchBar from './SearchBar'

vi.mock('../../services/catalogService', () => ({
  catalogService: { getProducts: vi.fn() },
}))

const PRODUCT = {
  id: 1,
  name: 'Matte Velvet Lipstick',
  slug: 'matte-velvet-lipstick',
  brand: { name: 'Jordan Beauty' },
  primary_image: null,
  min_price: '699.00',
}

function renderSearch() {
  renderWithProviders(
    <Routes>
      <Route path="/" element={<SearchBar />} />
      <Route path="/products/:slug" element={<p>Product page</p>} />
    </Routes>,
  )
  return screen.getByRole('combobox', { name: 'Search products' })
}

describe('SearchBar suggestions', () => {
  beforeEach(() => {
    catalogService.getProducts.mockResolvedValue({ results: [PRODUCT] })
  })

  it('suggests matching products and opens one with the keyboard', async () => {
    const input = renderSearch()

    await userEvent.type(input, 'li')
    expect(await screen.findByRole('option', { name: /Matte Velvet Lipstick/ })).toBeInTheDocument()
    expect(catalogService.getProducts).toHaveBeenCalledWith({ search: 'li', page_size: 5 })
    expect(input).toHaveAttribute('aria-expanded', 'true')

    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(await screen.findByText('Product page')).toBeInTheDocument()
  })

  it('waits for at least two characters and closes on Escape', async () => {
    const input = renderSearch()

    await userEvent.type(input, 'l')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(catalogService.getProducts).not.toHaveBeenCalled()

    await userEvent.type(input, 'i')
    await screen.findByRole('option')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })
})
