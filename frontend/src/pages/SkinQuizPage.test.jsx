import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { catalogService } from '../services/catalogService'
import { renderWithProviders } from '../test/renderWithProviders'
import SkinQuizPage from './SkinQuizPage'

vi.mock('../services/catalogService', () => ({
  catalogService: {
    getSkinTypes: vi.fn(),
    getConcerns: vi.fn(),
    getRoutine: vi.fn(),
  },
}))

const PRODUCT = {
  id: 1,
  name: 'Gentle Foaming Face Wash',
  slug: 'gentle-foaming-face-wash',
  primary_image: null,
  min_price: '249.00',
  min_compare_at_price: null,
}

const ROUTINE = {
  morning: [
    { step: 'cleanser', label: 'Cleanser', product: PRODUCT },
    { step: 'toner', label: 'Toner', product: null },
  ],
  night: [{ step: 'cleanser', label: 'Cleanser', product: PRODUCT }],
  bag_variant_ids: [11],
  total_price: '249.00',
}

beforeEach(() => {
  catalogService.getSkinTypes.mockResolvedValue([
    { name: 'Oily', slug: 'oily', description: 'Shiny by midday.' },
    { name: 'Dry', slug: 'dry', description: 'Feels tight.' },
  ])
  catalogService.getConcerns.mockResolvedValue([{ id: 1, name: 'Acne', slug: 'acne', description: '' }])
  catalogService.getRoutine.mockResolvedValue(ROUTINE)
})

describe('SkinQuizPage', () => {
  it('walks through three questions, supports going back, and shows the routine', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SkinQuizPage />, { route: '/skin-quiz' })

    expect(await screen.findByRole('heading', { name: 'What is your skin type?' })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /oily/i }))

    expect(await screen.findByRole('heading', { name: 'What would you most like to fix?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /back/i }))
    await user.click(await screen.findByRole('button', { name: /dry/i }))
    await user.click(await screen.findByRole('button', { name: /acne/i }))

    expect(screen.getByRole('heading', { name: 'What is your budget per product?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /under ₹499/i }))

    expect(await screen.findByRole('heading', { name: 'Your personal routine' })).toBeInTheDocument()
    expect(catalogService.getRoutine).toHaveBeenCalledWith({ skin_type: 'dry', concern: 'acne', max_price: '499' })
    expect(screen.getAllByText('Gentle Foaming Face Wash')).toHaveLength(2)
    expect(screen.getByText(/no match yet/i)).toBeInTheDocument()
    expect(screen.getAllByText('₹249')).toHaveLength(3)
  })

  it('sends no concern or price limit when those questions are skipped', async () => {
    renderWithProviders(<SkinQuizPage />, { route: '/skin-quiz?skin=oily&concern=none&budget=any' })

    expect(await screen.findByRole('heading', { name: 'Your personal routine' })).toBeInTheDocument()
    expect(catalogService.getRoutine).toHaveBeenCalledWith({ skin_type: 'oily' })
  })

  it('adds the whole routine for signed-in shoppers', async () => {
    const user = userEvent.setup()
    const { cartValue, toastValue } = renderWithProviders(<SkinQuizPage />, {
      route: '/skin-quiz?skin=oily&concern=acne&budget=999',
      auth: { isAuthenticated: true },
    })

    await user.click(await screen.findByRole('button', { name: /add whole routine to bag/i }))
    expect(cartValue.addItem).toHaveBeenCalledWith(11, 1)
    expect(toastValue.showToast).toHaveBeenCalledWith('Your routine added to your bag (1 item).')
  })

  it('starts again from the first question', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SkinQuizPage />, { route: '/skin-quiz?skin=oily&concern=acne&budget=999' })

    await user.click(await screen.findByRole('button', { name: /retake quiz/i }))
    expect(await screen.findByRole('heading', { name: 'What is your skin type?' })).toBeInTheDocument()
  })
})
