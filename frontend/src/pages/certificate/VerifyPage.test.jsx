import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'

import { certificateService } from '../../services/certificateService'
import { renderWithProviders } from '../../test/renderWithProviders'
import VerifyPage from './VerifyPage'

vi.mock('../../services/certificateService', () => ({
  certificateService: {
    verify: vi.fn(),
  },
}))

describe('VerifyPage', () => {
  it('navigates from the serial form to the verify result route', async () => {
    certificateService.verify.mockResolvedValue({
      valid: true,
      status: 'issued',
      certificate_id: 'JBH-2026-000042',
      student_name: 'Asha Rao',
      course_name: 'Bridal Makeup',
      institute_name: 'Jordan Beauty Hub',
      issue_date: '2026-03-01',
      completion_date: '2026-02-20',
      grade: 'A',
      enrollment_number: 'ENR-001',
      duration: '6 weeks',
      replaces: '',
      superseded_by: '',
      message: 'This certificate is authentic and was issued by Jordan Beauty Hub.',
    })

    renderWithProviders(
      <Routes>
        <Route path="/certificate/verify" element={<VerifyPage />} />
        <Route path="/certificate/verify/:certificateId" element={<VerifyPage />} />
      </Routes>,
      { route: '/certificate/verify' },
    )

    await userEvent.type(screen.getByLabelText(/certificate serial number/i), 'jbh-2026-000042')
    await userEvent.click(screen.getByRole('button', { name: /^verify$/i }))

    await waitFor(() => {
      expect(certificateService.verify).toHaveBeenCalledWith('JBH-2026-000042')
    })
    expect(await screen.findByText('Authentic')).toBeInTheDocument()
    expect(screen.getByText('JBH-2026-000042')).toBeInTheDocument()
    expect(screen.getByText('Asha Rao')).toBeInTheDocument()
    expect(screen.getByText('Bridal Makeup')).toBeInTheDocument()
  })

  it('shows not-found messaging for unknown serials', async () => {
    certificateService.verify.mockRejectedValue({
      response: {
        data: {
          valid: false,
          status: 'not_found',
          certificate_id: 'JBH-2099-999999',
          student_name: '',
          course_name: '',
          institute_name: 'Jordan Beauty Hub',
          issue_date: null,
          message: 'No certificate was found for this serial number.',
        },
      },
    })

    renderWithProviders(
      <Routes>
        <Route path="/certificate/verify/:certificateId" element={<VerifyPage />} />
      </Routes>,
      { route: '/certificate/verify/JBH-2099-999999' },
    )

    expect(await screen.findByText('Not found')).toBeInTheDocument()
    expect(screen.getByText(/no certificate was found/i)).toBeInTheDocument()
  })
})
