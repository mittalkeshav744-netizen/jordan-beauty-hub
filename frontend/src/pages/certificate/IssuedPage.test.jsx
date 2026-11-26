import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { certificateService } from '../../services/certificateService'
import { renderWithProviders } from '../../test/renderWithProviders'
import IssuedPage from './IssuedPage'

vi.mock('../../services/certificateService', () => ({
  certificateService: {
    listIssued: vi.fn(),
    revoke: vi.fn(),
    deleteIssued: vi.fn(),
    downloadPdf: vi.fn(),
    printPdf: vi.fn(),
    printBundle: vi.fn(),
  },
}))

describe('IssuedPage cancel and delete actions', () => {
  const sampleRow = {
    id: 3,
    public_id: 'JBH-2026-000005',
    student_name: 'Naveen',
    course_title: 'Hair Styling Studio',
    group_name: '',
    issue_date: '2026-11-26',
    status: 'issued',
    email_status: 'sent',
  }

  it('cancels (revokes) or deletes a certificate after confirmation', async () => {
    certificateService.listIssued.mockResolvedValue({ results: [sampleRow], count: 1 })
    certificateService.revoke.mockResolvedValue({ ...sampleRow, status: 'revoked' })
    certificateService.deleteIssued.mockResolvedValue({})

    renderWithProviders(<IssuedPage />)
    expect(await screen.findByText('JBH-2026-000005')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel JBH-2026-000005' }))
    await userEvent.click(await screen.findByRole('button', { name: /^cancel certificate$/i }))
    await waitFor(() => {
      expect(certificateService.revoke).toHaveBeenCalledWith(3, 'Cancelled by administrator')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Delete JBH-2026-000005' }))
    await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }))
    await waitFor(() => {
      expect(certificateService.deleteIssued).toHaveBeenCalledWith(3)
    })
  })
})
