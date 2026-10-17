import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../test/renderWithProviders'
import BeautyChat from './BeautyChat'

vi.mock('../../services/storeService', () => ({
  storeService: {
    getSettings: vi.fn(),
    chat: vi.fn(),
  },
}))

import { storeService } from '../../services/storeService'

describe('BeautyChat', () => {
  beforeEach(() => {
    storeService.getSettings.mockReset()
    storeService.chat.mockReset()
  })

  it('stays hidden when the assistant is not configured', async () => {
    storeService.getSettings.mockResolvedValue({ chat_enabled: false, whatsapp_number: '' })
    renderWithProviders(<BeautyChat />)
    await waitFor(() => expect(storeService.getSettings).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /ask us/i })).not.toBeInTheDocument()
  })

  it('sends a question and shows the reply', async () => {
    storeService.getSettings.mockResolvedValue({ chat_enabled: true, whatsapp_number: '' })
    storeService.chat.mockResolvedValue({ reply: 'Yes, we only take Cash on Delivery.' })

    renderWithProviders(<BeautyChat />)
    await screen.findByRole('button', { name: /ask us/i })
    await userEvent.click(screen.getByRole('button', { name: /ask us/i }))
    await userEvent.type(screen.getByLabelText(/message the beauty assistant/i), 'Do you have COD?')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByText('Yes, we only take Cash on Delivery.')).toBeInTheDocument()
    expect(storeService.chat).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Do you have COD?' }),
    )
  })
})
