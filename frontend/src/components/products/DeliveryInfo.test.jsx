import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { storeService } from '../../services/storeService'
import { renderWithProviders } from '../../test/renderWithProviders'
import FreeShippingProgress from '../cart/FreeShippingProgress'
import DeliveryInfo from './DeliveryInfo'

vi.mock('../../services/storeService', () => ({
  storeService: { getSettings: vi.fn() },
}))

const SETTINGS = {
  currency: 'INR',
  shipping_flat_fee: '49.00',
  free_shipping_threshold: '499.00',
  whatsapp_number: '',
}

describe('DeliveryInfo', () => {
  it('shows delivery terms and checks a PIN code', async () => {
    storeService.getSettings.mockResolvedValue(SETTINGS)
    renderWithProviders(<DeliveryInfo productName="Glow Serum" />)

    expect(await screen.findByText('Free delivery on orders above ₹499')).toBeInTheDocument()
    expect(screen.getByText(/No returns\. Damaged or wrong items are replaced\./)).toBeInTheDocument()
    expect(screen.queryByText(/WhatsApp/)).not.toBeInTheDocument()

    const pin = screen.getByLabelText('Check delivery')
    await userEvent.type(pin, '012345')
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByText('Enter a valid 6-digit PIN code.')).toBeInTheDocument()

    await userEvent.clear(pin)
    await userEvent.type(pin, '560001')
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByRole('status')).toHaveTextContent('Delivery available to 560001.')
  })

  it('links to WhatsApp when the shop has a number', async () => {
    storeService.getSettings.mockResolvedValue({ ...SETTINGS, whatsapp_number: '919876543210' })
    renderWithProviders(<DeliveryInfo productName="Glow Serum" />)

    const link = await screen.findByRole('link', { name: /chat with us on whatsapp/i })
    expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/)
  })
})

describe('FreeShippingProgress', () => {
  it('shows how much more is needed for free delivery', async () => {
    storeService.getSettings.mockResolvedValue(SETTINGS)
    renderWithProviders(<FreeShippingProgress subtotal="300.00" />)

    expect(await screen.findByText('₹199')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60')
  })

  it('stays hidden when delivery is always free', async () => {
    storeService.getSettings.mockResolvedValue({ ...SETTINGS, shipping_flat_fee: '0.00' })
    const { container } = renderWithProviders(<FreeShippingProgress subtotal="300.00" />)

    await vi.waitFor(() => expect(storeService.getSettings).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
