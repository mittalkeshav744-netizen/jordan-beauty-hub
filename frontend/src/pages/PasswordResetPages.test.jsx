import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'

import { authService } from '../services/authService'
import { renderWithProviders } from '../test/renderWithProviders'
import ForgotPasswordPage from './ForgotPasswordPage'
import ResetPasswordPage from './ResetPasswordPage'

vi.mock('../services/authService', () => ({
  authService: { requestPasswordReset: vi.fn(), confirmPasswordReset: vi.fn() },
}))

describe('ForgotPasswordPage', () => {
  it('sends the reset request and shows the reply', async () => {
    authService.requestPasswordReset.mockResolvedValue({ detail: 'If an account uses this email, we sent a link.' })
    renderWithProviders(<ForgotPasswordPage />)

    await userEvent.type(screen.getByLabelText(/email/i), ' asha@example.com ')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(authService.requestPasswordReset).toHaveBeenCalledWith('asha@example.com')
    expect(await screen.findByText('If an account uses this email, we sent a link.')).toBeInTheDocument()
  })
})

describe('ResetPasswordPage', () => {
  function renderReset(toast) {
    return renderWithProviders(
      <Routes>
        <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
        <Route path="/login" element={<p>Sign in page</p>} />
      </Routes>,
      { route: '/reset-password/MQ/abc-123', toast },
    )
  }

  it('checks that both passwords match before calling the API', async () => {
    renderReset()
    await userEvent.type(screen.getByLabelText(/^new password/i), 'Str0ng-pass-phrase!')
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'different')
    await userEvent.click(screen.getByRole('button', { name: /save new password/i }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(authService.confirmPasswordReset).not.toHaveBeenCalled()
  })

  it('saves the new password from the link and goes to sign in', async () => {
    authService.confirmPasswordReset.mockResolvedValue({ detail: 'Your password has been changed. Please sign in.' })
    const { toastValue } = renderReset()

    await userEvent.type(screen.getByLabelText(/^new password/i), 'Str0ng-pass-phrase!')
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'Str0ng-pass-phrase!')
    await userEvent.click(screen.getByRole('button', { name: /save new password/i }))

    expect(authService.confirmPasswordReset).toHaveBeenCalledWith({
      uid: 'MQ',
      token: 'abc-123',
      new_password: 'Str0ng-pass-phrase!',
    })
    expect(await screen.findByText('Sign in page')).toBeInTheDocument()
    expect(toastValue.showToast).toHaveBeenCalledWith('Your password has been changed. Please sign in.')
  })
})
