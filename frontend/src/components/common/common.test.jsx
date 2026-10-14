import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import Button from './Button'
import ErrorMessage from './ErrorMessage'
import PriceDisplay from './PriceDisplay'
import QuantitySelector from './QuantitySelector'

describe('Button', () => {
  it('is disabled and busy while loading', () => {
    render(<Button isLoading>Save</Button>)
    const button = screen.getByRole('button', { name: /save/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})

describe('PriceDisplay', () => {
  it('shows the sale price, original price and discount', () => {
    render(<PriceDisplay price="699.00" compareAtPrice="999.00" />)
    expect(screen.getByText('₹699')).toBeInTheDocument()
    expect(screen.getByText('₹999')).toBeInTheDocument()
    expect(screen.getByText('30% off')).toBeInTheDocument()
  })

  it('hides the discount when there is no compare-at price', () => {
    render(<PriceDisplay price="250.00" />)
    expect(screen.queryByText(/off/)).not.toBeInTheDocument()
  })
})

describe('QuantitySelector', () => {
  it('increments and respects the minimum and maximum', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<QuantitySelector value={1} max={2} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /increase/i }))
    expect(onChange).toHaveBeenCalledWith(2)

    rerender(<QuantitySelector value={2} max={2} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /increase/i })).toBeDisabled()
  })
})

describe('ErrorMessage', () => {
  it('shows the API detail message and a retry button', async () => {
    const onRetry = vi.fn()
    const error = { response: { status: 400, data: { detail: 'Coupon expired.' } } }
    render(<ErrorMessage error={error} onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Coupon expired.')
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('explains network failures', () => {
    render(<ErrorMessage error={{ message: 'Network Error' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot reach the server/i)
  })
})
