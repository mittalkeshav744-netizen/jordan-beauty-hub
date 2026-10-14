import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import Drawer from './Drawer'

function DrawerHarness() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open filters
      </button>
      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} title="Filters">
        <label>
          <input type="checkbox" /> Lips
        </label>
      </Drawer>
    </>
  )
}

describe('Drawer', () => {
  it('moves focus inside, locks scrolling, and closes on Escape', async () => {
    const user = userEvent.setup()
    render(<DrawerHarness />)
    const opener = screen.getByRole('button', { name: 'Open filters' })

    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Filters' })
    expect(dialog).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
    expect(opener).toHaveFocus()
  })

  it('keeps Tab focus within the panel', async () => {
    const user = userEvent.setup()
    render(<DrawerHarness />)
    await user.click(screen.getByRole('button', { name: 'Open filters' }))

    const closeButton = screen.getByRole('button', { name: 'Close filters' })
    const checkbox = screen.getByRole('checkbox', { name: 'Lips' })
    await user.tab()
    expect(closeButton).toHaveFocus()
    await user.tab()
    expect(checkbox).toHaveFocus()
    await user.tab()
    expect(closeButton).toHaveFocus()
  })
})
