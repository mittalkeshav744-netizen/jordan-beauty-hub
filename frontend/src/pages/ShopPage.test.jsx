import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { catalogService } from '../services/catalogService'
import { renderWithProviders } from '../test/renderWithProviders'
import ShopPage from './ShopPage'

vi.mock('../services/catalogService', () => ({
  catalogService: {
    getCategories: vi.fn(),
    getBrands: vi.fn(),
    getConcerns: vi.fn(),
    getProducts: vi.fn(),
    getPriceRange: vi.fn(),
  },
}))

const PRODUCT = {
  id: 1,
  name: 'Matte Velvet Lipstick',
  slug: 'matte-velvet-lipstick',
  brand: { name: 'Jordan Beauty', slug: 'jordan-beauty' },
  category: { name: 'Lips', slug: 'lips' },
  primary_image: null,
  min_price: '699.00',
  min_compare_at_price: null,
  average_rating: null,
  review_count: 0,
  is_in_stock: true,
  is_featured: false,
  default_variant_id: 10,
  variant_count: 1,
}

beforeEach(() => {
  catalogService.getCategories.mockResolvedValue([{ id: 1, name: 'Lips', slug: 'lips' }])
  catalogService.getBrands.mockResolvedValue([])
  catalogService.getConcerns.mockResolvedValue([
    { id: 1, name: 'Acne & breakouts', slug: 'acne', description: 'Clear pores and calm breakouts.', image: null },
  ])
  catalogService.getPriceRange.mockResolvedValue({ min: '249.00', max: '1199.00' })
})

describe('ShopPage', () => {
  it('shows loading skeletons, then products from the API', async () => {
    catalogService.getProducts.mockResolvedValue({ count: 1, results: [PRODUCT] })
    renderWithProviders(<ShopPage />, { route: '/shop?category=lips' })

    expect(screen.getByLabelText('Loading products')).toBeInTheDocument()
    expect(await screen.findByText('Matte Velvet Lipstick')).toBeInTheDocument()
    expect(catalogService.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'lips', ordering: 'newest', page: 1 }),
    )
  })

  it('shows an empty state when nothing matches', async () => {
    catalogService.getProducts.mockResolvedValue({ count: 0, results: [] })
    renderWithProviders(<ShopPage />, { route: '/shop?search=zzz' })
    expect(await screen.findByText('No products found')).toBeInTheDocument()
  })

  it('shows an error with a working retry button', async () => {
    catalogService.getProducts
      .mockRejectedValueOnce({ response: { status: 500, data: {} } })
      .mockResolvedValueOnce({ count: 1, results: [PRODUCT] })
    renderWithProviders(<ShopPage />)

    expect(await screen.findByText(/our server had a problem/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Matte Velvet Lipstick')).toBeInTheDocument()
  })

  it('applies filters from the mobile filter drawer', async () => {
    const user = userEvent.setup()
    catalogService.getProducts.mockResolvedValue({ count: 1, results: [PRODUCT] })
    renderWithProviders(<ShopPage />)
    await screen.findByText('Matte Velvet Lipstick')

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const drawer = screen.getByRole('dialog', { name: 'Filters' })
    expect(within(drawer).queryByRole('checkbox', { name: 'Lips' })).not.toBeInTheDocument()
    await user.click(within(drawer).getByRole('switch', { name: 'In stock only' }))

    expect(catalogService.getProducts).toHaveBeenLastCalledWith(expect.objectContaining({ in_stock: 'true', page: 1 }))
    await user.click(await within(drawer).findByRole('button', { name: /show 1 item/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeInTheDocument()
  })

  it('filters by stock with the switch and by price with the ₹ boxes', async () => {
    const user = userEvent.setup()
    catalogService.getProducts.mockResolvedValue({ count: 1, results: [PRODUCT] })
    renderWithProviders(<ShopPage />)
    const filters = await screen.findByRole('complementary', { name: 'Product filters' })

    await user.click(within(filters).getByRole('switch', { name: 'In stock only' }))
    expect(catalogService.getProducts).toHaveBeenLastCalledWith(expect.objectContaining({ in_stock: 'true' }))

    const minimum = await within(filters).findByLabelText('Minimum price in rupees')
    expect(minimum).toHaveValue('249')
    await user.clear(minimum)
    await user.type(minimum, '500{Enter}')
    expect(catalogService.getProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ min_price: '500', in_stock: 'true' }),
    )
    expect(catalogService.getProducts.mock.lastCall[0]).not.toHaveProperty('max_price')
  })

  it('removes an applied filter from its chip', async () => {
    const user = userEvent.setup()
    catalogService.getProducts.mockResolvedValue({ count: 1, results: [PRODUCT] })
    renderWithProviders(<ShopPage />, { route: '/shop?min_price=500&max_price=900' })

    await user.click(await screen.findByRole('button', { name: 'Remove filter: ₹500 – ₹900' }))
    expect(catalogService.getProducts.mock.lastCall[0]).not.toHaveProperty('min_price')
    expect(catalogService.getProducts.mock.lastCall[0]).not.toHaveProperty('max_price')
  })

  it('opens a concern page from the home page tiles', async () => {
    catalogService.getProducts.mockResolvedValue({ count: 1, results: [PRODUCT] })
    renderWithProviders(<ShopPage />, { route: '/shop?concern=acne' })

    expect(await screen.findByRole('heading', { level: 1, name: 'For acne & breakouts' })).toBeInTheDocument()
    expect(screen.getByText('Clear pores and calm breakouts.')).toBeInTheDocument()
    expect(catalogService.getProducts).toHaveBeenCalledWith(expect.objectContaining({ concern: 'acne' }))
    expect(screen.queryByRole('checkbox', { name: 'Acne & breakouts' })).not.toBeInTheDocument()
  })

  it('sends signed-out shoppers to sign in when adding to bag', async () => {
    catalogService.getProducts.mockResolvedValue({ count: 1, results: [PRODUCT] })
    const { cartValue, toastValue } = renderWithProviders(<ShopPage />)

    await userEvent.click(await screen.findByRole('button', { name: /add to bag/i }))
    expect(cartValue.addItem).not.toHaveBeenCalled()
    expect(toastValue.showToast).toHaveBeenCalledWith(expect.stringMatching(/sign in/i), 'info')
  })
})
