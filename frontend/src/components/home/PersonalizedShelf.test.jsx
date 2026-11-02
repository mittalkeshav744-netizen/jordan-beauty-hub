import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { catalogService } from '../../services/catalogService'
import { renderWithProviders } from '../../test/renderWithProviders'
import PersonalizedShelf from './PersonalizedShelf'

vi.mock('../../services/catalogService', () => ({
  catalogService: {
    getRecommendations: vi.fn(),
  },
}))

describe('PersonalizedShelf', () => {
  const mockProducts = [
    {
      id: 1,
      name: 'Niacinamide Balancing Serum',
      slug: 'niacinamide-serum',
      brand: { name: 'Jordan Glow' },
      min_price: '599.00',
      is_in_stock: true,
      variant_count: 1,
      default_variant_id: 10,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('shows generic popular picks for guests (no personalization params)', async () => {
    localStorage.setItem(
      'jbh_beauty_profile',
      JSON.stringify({ skin: 'oily', concern: 'acne', budget: '499' }),
    )
    catalogService.getRecommendations.mockResolvedValue(mockProducts)
    renderWithProviders(<PersonalizedShelf />)

    expect(await screen.findByText('Bestsellers & favourites')).toBeInTheDocument()
    expect(screen.getByText('Start the quiz')).toBeInTheDocument()
    expect(screen.getByText('Niacinamide Balancing Serum')).toBeInTheDocument()
    expect(catalogService.getRecommendations).toHaveBeenCalledWith({ context: 'home' })
    expect(screen.queryByText('oily skin')).not.toBeInTheDocument()
  })

  it('shows personalized badges only when signed in with a beauty profile', async () => {
    catalogService.getRecommendations.mockResolvedValue(mockProducts)
    renderWithProviders(<PersonalizedShelf />, {
      auth: {
        isAuthenticated: true,
        user: {
          id: 1,
          beauty_profile: {
            skin_type: 'oily',
            primary_concern: 'acne',
            budget_preference: '799.00',
          },
        },
      },
    })

    expect(await screen.findByText('Formulated For You')).toBeInTheDocument()
    expect(screen.getByText('oily skin')).toBeInTheDocument()
    expect(screen.getByText('acne')).toBeInTheDocument()
    expect(screen.getByText('Retake quiz')).toBeInTheDocument()
    expect(screen.getByText('Picked for your skin')).toBeInTheDocument()
    expect(catalogService.getRecommendations).toHaveBeenCalledWith({
      context: 'home',
      skin_type: 'oily',
      concern: 'acne',
      max_price: '799',
    })
  })

  it('keeps the shelf generic for a signed-in user who has not taken the quiz', async () => {
    catalogService.getRecommendations.mockResolvedValue(mockProducts)
    renderWithProviders(<PersonalizedShelf />, {
      auth: {
        isAuthenticated: true,
        user: { id: 2, email: 'new@example.com', beauty_profile: null },
      },
    })

    expect(await screen.findByText('Bestsellers & favourites')).toBeInTheDocument()
    expect(catalogService.getRecommendations).toHaveBeenCalledWith({ context: 'home' })
  })
})
