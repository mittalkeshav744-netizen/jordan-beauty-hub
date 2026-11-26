import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import SearchAndFilter from '../../components/certificate/SearchAndFilter'
import { certificateService } from '../../services/certificateService'
import { renderWithProviders } from '../../test/renderWithProviders'
import GeneratorPage from './GeneratorPage'

vi.mock('../../services/certificateService', () => ({
  certificateService: {
    listCourses: vi.fn(),
    listTemplates: vi.fn(),
    listFields: vi.fn(),
    listGroups: vi.fn(),
    listStudents: vi.fn(),
    listIssued: vi.fn(),
    generate: vi.fn(),
    getJob: vi.fn(),
    downloadPdf: vi.fn(),
    printPdf: vi.fn(),
    printBundle: vi.fn(),
  },
}))

describe('SearchAndFilter and GeneratorPage', () => {
  it('adds search input left padding class so placeholder clears the search icon', () => {
    renderWithProviders(
      <SearchAndFilter search="" onSearchChange={() => {}} searchPlaceholder="Search courses" />,
    )
    const input = screen.getByPlaceholderText('Search courses')
    expect(input).toHaveClass('cert-input', 'cert-input--search', 'pl-9')
  })

  it('shows existing issued badge, surfaces duplicate error, and offers one-click reissue', async () => {
    certificateService.listCourses.mockResolvedValue({
      results: [{ id: 2, title: 'Skin Care Essentials' }],
    })
    certificateService.listTemplates.mockResolvedValue({
      results: [{ id: 1, name: 'Main Template', is_default: true }],
    })
    certificateService.listFields.mockResolvedValue([])
    certificateService.listGroups.mockResolvedValue({ results: [] })
    certificateService.listStudents.mockResolvedValue({
      results: [{ id: 2, full_name: 'Naveen' }],
    })
    certificateService.listIssued.mockResolvedValue({
      results: [{ id: 1, public_id: 'JBH-2026-000003', student: 2, course: 2 }],
    })
    certificateService.generate
      .mockResolvedValueOnce({
        id: 10,
        status: 'completed',
        current: 1,
        total: 1,
        result: {
          created: [],
          created_items: [],
          emailed: [],
          errors: [
            {
              student_id: 2,
              error: 'An issued certificate already exists for this student and course (JBH-2026-000003).',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        id: 11,
        status: 'completed',
        current: 1,
        total: 1,
        result: {
          created: ['JBH-2026-000006'],
          created_items: [{ id: 4, public_id: 'JBH-2026-000006', student_name: 'Naveen' }],
          emailed: ['JBH-2026-000006'],
          errors: [],
        },
      })

    renderWithProviders(<GeneratorPage />)

    const courseSelect = await screen.findByLabelText(/course \*/i)
    await userEvent.selectOptions(courseSelect, '2')

    expect(await screen.findByText('Issued: JBH-2026-000003')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: /naveen/i }))
    await userEvent.click(screen.getByRole('button', { name: /generate \(1\)/i }))

    const reissueBtn = await screen.findByRole('button', {
      name: /reissue & generate new certificate/i,
    })
    expect(screen.getAllByText(/already exists for this student and course/i).length).toBeGreaterThan(0)

    await userEvent.click(reissueBtn)
    await waitFor(() => {
      expect(certificateService.generate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          course_id: 2,
          student_ids: [2],
          force_reissue: true,
        }),
      )
    })
    expect(await screen.findByText('JBH-2026-000006')).toBeInTheDocument()
  })
})
