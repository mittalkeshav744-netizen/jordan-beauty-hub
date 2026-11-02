import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../test/renderWithProviders'
import BeautyChat from './BeautyChat'

vi.mock('../../services/storeService', () => ({
  storeService: {
    getSettings: vi.fn(),
    chat: vi.fn(),
    chatStream: vi.fn(),
  },
}))

vi.mock('../../hooks/useAddToCart', () => ({
  useAddToCart: () => ({
    addToCart: vi.fn().mockResolvedValue(true),
    pendingVariantId: null,
  }),
}))

import { storeService } from '../../services/storeService'

function mockStream(donePayload, { tokens = [], status } = {}) {
  storeService.chatStream.mockImplementation(async (_payload, handlers = {}) => {
    if (status) handlers.onStatus?.(status)
    for (const token of tokens) handlers.onToken?.(token)
    handlers.onDone?.(donePayload)
    return donePayload
  })
}

describe('BeautyChat', () => {
  beforeEach(() => {
    storeService.getSettings.mockReset()
    storeService.chat.mockReset()
    storeService.chatStream.mockReset()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('stays hidden when the assistant is not configured', async () => {
    storeService.getSettings.mockResolvedValue({ chat_enabled: false, whatsapp_number: '' })
    renderWithProviders(<BeautyChat />)
    await waitFor(() => expect(storeService.getSettings).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /ask us/i })).not.toBeInTheDocument()
  })

  it('sends a question with page path and shows the reply', async () => {
    storeService.getSettings.mockResolvedValue({ chat_enabled: true, whatsapp_number: '' })
    mockStream(
      {
        reply: 'Yes, we only take Cash on Delivery.',
        requires_auth: false,
        products: [],
        product_paths: [],
        suggested_replies: [{ label: 'Delivery', message: 'How does delivery work?' }],
        whatsapp_url: null,
      },
      { tokens: ['Yes, we only take Cash on Delivery.'] },
    )

    renderWithProviders(<BeautyChat />, { route: '/shop' })
    await screen.findByRole('button', { name: /ask us/i })
    await userEvent.click(screen.getByRole('button', { name: /ask us/i }))
    await userEvent.type(screen.getByLabelText(/message the beauty assistant/i), 'Do you have COD?')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByText('Yes, we only take Cash on Delivery.')).toBeInTheDocument()
    expect(storeService.chatStream).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Do you have COD?', page_path: '/shop' }),
      expect.any(Object),
    )
  })

  it('falls back to non-stream chat when SSE fails', async () => {
    storeService.getSettings.mockResolvedValue({ chat_enabled: true, whatsapp_number: '' })
    storeService.chatStream.mockRejectedValue(new Error('stream broken'))
    storeService.chat.mockResolvedValue({
      reply: 'We deliver across India.',
      requires_auth: false,
      products: [],
      product_paths: [],
      suggested_replies: [],
      whatsapp_url: null,
    })

    renderWithProviders(<BeautyChat />, { route: '/shop' })
    await screen.findByRole('button', { name: /ask us/i })
    await userEvent.click(screen.getByRole('button', { name: /ask us/i }))
    await userEvent.type(screen.getByLabelText(/message the beauty assistant/i), 'How does delivery work?')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByText('We deliver across India.')).toBeInTheDocument()
    expect(storeService.chat).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'How does delivery work?', page_path: '/shop' }),
    )
  })

  it('shows register and sign-in links for guests', async () => {
    storeService.getSettings.mockResolvedValue({ chat_enabled: true, whatsapp_number: '' })
    renderWithProviders(<BeautyChat />)
    await screen.findByRole('button', { name: /ask us/i })
    await userEvent.click(screen.getByRole('button', { name: /ask us/i }))
    expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })

  it('renders chips, product cards, and add-to-bag for members', async () => {
    storeService.getSettings.mockResolvedValue({
      chat_enabled: true,
      whatsapp_number: '919876543210',
    })
    mockStream({
      reply: 'Start with an even base.',
      requires_auth: false,
      product_paths: ['/products/second-skin-foundation'],
      products: [
        {
          slug: 'second-skin-foundation',
          name: 'Second Skin Foundation',
          path: '/products/second-skin-foundation',
          brand: 'Jordan Beauty',
          category: 'Face',
          short_description: 'Lightweight base',
          reason: 'Even finish for brown skin',
          image: null,
          default_variant_id: 42,
          variant_count: 1,
        },
      ],
      suggested_replies: [],
      whatsapp_url: 'https://wa.me/919876543210?text=Hi',
    })

    renderWithProviders(<BeautyChat />, {
      route: '/products/second-skin-foundation',
      auth: { isAuthenticated: true, user: { id: 1, first_name: 'Asha' } },
    })
    await screen.findByRole('button', { name: /ask us/i })
    await userEvent.click(screen.getByRole('button', { name: /ask us/i }))

    expect(screen.getByRole('link', { name: /chat on whatsapp/i })).toBeInTheDocument()
    const makeupChip = await screen.findByRole('button', { name: /brown skin makeup/i })
    await userEvent.click(makeupChip)
    expect(await screen.findByText('Second Skin Foundation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to bag/i })).toBeInTheDocument()
    expect(storeService.chatStream).toHaveBeenCalledWith(
      expect.objectContaining({ page_path: '/products/second-skin-foundation' }),
      expect.any(Object),
    )
  })
})
