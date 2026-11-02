import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '../../test/renderWithProviders'
import ManageLoginPage from './ManageLoginPage'

describe('ManageLoginPage', () => {
  it('validates staff email and password on the client', async () => {
    const { authValue } = renderWithProviders(<ManageLoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /sign in to owner portal/i }))

    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(authValue.login).not.toHaveBeenCalled()
  })

  it('allows staff accounts to log in successfully', async () => {
    const login = vi.fn().mockResolvedValue({ email: 'mail@gmail.com', is_staff: true })
    renderWithProviders(<ManageLoginPage />, { auth: { login } })

    await userEvent.type(screen.getByLabelText(/staff email/i), 'mail@gmail.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secure-password')
    await userEvent.click(screen.getByRole('button', { name: /sign in to owner portal/i }))

    expect(login).toHaveBeenCalledWith({ email: 'mail@gmail.com', password: 'secure-password' })
  })

  it('strictly blocks customer accounts without staff permissions', async () => {
    const login = vi.fn().mockResolvedValue({ email: 'customer@example.com', is_staff: false })
    const logout = vi.fn().mockResolvedValue()
    renderWithProviders(<ManageLoginPage />, { auth: { login, logout } })

    await userEvent.type(screen.getByLabelText(/staff email/i), 'customer@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'customer-password')
    await userEvent.click(screen.getByRole('button', { name: /sign in to owner portal/i }))

    expect(login).toHaveBeenCalledWith({ email: 'customer@example.com', password: 'customer-password' })
    expect(logout).toHaveBeenCalled()
    expect(
      await screen.findByText(/access denied. this account does not have owner or staff permissions/i),
    ).toBeInTheDocument()
  })

  it('shows notice when logged in as a non-staff customer', () => {
    renderWithProviders(<ManageLoginPage />, {
      auth: {
        isAuthenticated: true,
        user: { email: 'customer@example.com', is_staff: false },
      },
    })

    expect(screen.getByText(/staff permissions required/i)).toBeInTheDocument()
    expect(screen.getByText(/customer@example.com/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with staff account/i })).toBeInTheDocument()
  })
})
