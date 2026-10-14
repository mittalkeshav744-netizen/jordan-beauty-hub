import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '../test/renderWithProviders'
import LoginPage from './LoginPage'

describe('LoginPage', () => {
  it('validates fields on the client before calling the API', async () => {
    const { authValue } = renderWithProviders(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(authValue.login).not.toHaveBeenCalled()
  })

  it('submits credentials', async () => {
    const login = vi.fn().mockResolvedValue({ email: 'asha@example.com' })
    renderWithProviders(<LoginPage />, { auth: { login } })

    await userEvent.type(screen.getByLabelText(/email/i), 'asha@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret-pass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(login).toHaveBeenCalledWith({ email: 'asha@example.com', password: 'secret-pass' })
  })

  it('shows the server error when sign-in fails', async () => {
    const login = vi.fn().mockRejectedValue({
      response: {
        status: 400,
        data: { detail: 'Incorrect email or password.', errors: { non_field_errors: ['Incorrect email or password.'] } },
      },
    })
    renderWithProviders(<LoginPage />, { auth: { login } })

    await userEvent.type(screen.getByLabelText(/email/i), 'asha@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
  })
})
