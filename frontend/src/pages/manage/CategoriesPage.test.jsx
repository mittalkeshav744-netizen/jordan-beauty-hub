import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '../../test/renderWithProviders'
import { portalService } from '../../services/portalService'
import CategoriesPage from './CategoriesPage'

vi.mock('../../services/portalService', () => ({
  portalService: {
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}))

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders categories from the portal API with their product count', async () => {
    portalService.listCategories.mockResolvedValue([
      {
        id: 1,
        name: 'Skincare',
        slug: 'skincare',
        description: 'Serums, toners and moisturisers',
        is_active: true,
        sort_order: 1,
        product_count: 5,
      },
      {
        id: 2,
        name: 'Fragrances',
        slug: 'fragrances',
        description: 'Luxury perfumes',
        is_active: false,
        sort_order: 2,
        product_count: 0,
      },
    ])

    renderWithProviders(<CategoriesPage />)

    expect(await screen.findByRole('heading', { name: 'Skincare' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fragrances' })).toBeInTheDocument()
    expect(screen.getByText('5 products →')).toBeInTheDocument()
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0)
  })

  it('creates a new category when the form is submitted', async () => {
    portalService.listCategories.mockResolvedValue([])
    portalService.createCategory.mockResolvedValue({
      id: 3,
      name: 'Body Care',
      slug: 'body-care',
      description: 'Body lotions and scrubs',
      sort_order: 0,
      is_active: true,
    })

    renderWithProviders(<CategoriesPage />)

    // Open form
    await userEvent.click(await screen.findByRole('button', { name: /new category/i }))

    expect(screen.getByText('Create new category')).toBeInTheDocument()

    // Fill form
    await userEvent.type(screen.getByPlaceholderText(/e\.g\. fragrances/i), 'Body Care')
    await userEvent.type(screen.getByPlaceholderText(/appears on category banners/i), 'Body lotions and scrubs')

    // Submit
    const dialog = screen.getByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: /create category/i, hidden: true }),
    )

    await waitFor(() => {
      expect(portalService.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Body Care',
          description: 'Body lotions and scrubs',
          is_active: true,
        }),
      )
    })
  })

  it('toggles category active status', async () => {
    portalService.listCategories.mockResolvedValue([
      {
        id: 1,
        name: 'Haircare',
        slug: 'haircare',
        is_active: true,
        product_count: 2,
      },
    ])
    portalService.updateCategory.mockResolvedValue({
      id: 1,
      name: 'Haircare',
      slug: 'haircare',
      is_active: false,
    })

    renderWithProviders(<CategoriesPage />)

    const toggleButton = await screen.findByRole('button', { name: /deactivate/i })
    await userEvent.click(toggleButton)

    expect(portalService.updateCategory).toHaveBeenCalledWith(1, { is_active: false })
  })
})
