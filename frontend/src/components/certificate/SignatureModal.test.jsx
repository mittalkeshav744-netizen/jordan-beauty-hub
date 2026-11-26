import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '../../test/renderWithProviders'
import SignatureModal from './SignatureModal'

describe('SignatureModal', () => {
  it('switches between draw, type, and upload signature tabs', async () => {
    renderWithProviders(
      <SignatureModal
        isOpen
        onClose={() => {}}
        onInsert={vi.fn()}
        defaultSignatory="Priya Sharma"
      />,
    )

    expect(screen.getByRole('tab', { name: /draw/i })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(screen.getByRole('tab', { name: /type/i }))
    expect(screen.getByDisplayValue('Priya Sharma')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /upload image/i }))
    expect(screen.getByLabelText(/remove white paper background/i)).toBeChecked()
  })
})
