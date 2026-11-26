import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { certificateService } from '../../services/certificateService'
import { renderWithProviders } from '../../test/renderWithProviders'
import DynamicFieldsManager from './DynamicFieldsManager'

vi.mock('../../services/certificateService', () => ({
  certificateService: {
    listFields: vi.fn(),
    fieldSources: vi.fn(),
    createField: vi.fn(),
    updateField: vi.fn(),
    deleteField: vi.fn(),
    restoreDefaultFields: vi.fn(),
  },
}))

describe('DynamicFieldsManager', () => {
  it('lists fields and lets staff add a new dynamic field', async () => {
    const onFieldsChange = vi.fn()
    certificateService.listFields.mockResolvedValue([
      {
        id: 1,
        key: 'student_name',
        label: 'Student name',
        source: 'student_name',
        default_value: '',
        sort_order: 10,
        is_active: true,
      },
    ])
    certificateService.fieldSources.mockResolvedValue([
      { value: 'custom', label: 'Custom text (default / per-batch value)' },
      { value: 'student_name', label: 'Student full name' },
    ])
    certificateService.createField.mockResolvedValue({
      id: 2,
      key: 'instructor_name',
      label: 'Instructor name',
      source: 'custom',
      default_value: 'Aanya',
      sort_order: 100,
      is_active: true,
    })

    renderWithProviders(<DynamicFieldsManager onFieldsChange={onFieldsChange} />)

    expect(await screen.findByText('Student name')).toBeInTheDocument()
    expect(screen.getByText('{{student_name}}')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /add field/i }))
    await userEvent.type(screen.getByLabelText(/field label/i), 'Instructor name')
    await userEvent.type(screen.getByLabelText(/default value/i), 'Aanya')
    await userEvent.click(screen.getByRole('button', { name: /save field/i }))

    await waitFor(() => {
      expect(certificateService.createField).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Instructor name',
          key: 'instructor_name',
          source: 'custom',
          default_value: 'Aanya',
          is_active: true,
        }),
      )
    })
    expect(await screen.findByText('{{instructor_name}}')).toBeInTheDocument()
    expect(onFieldsChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ key: 'student_name' }),
        expect.objectContaining({ key: 'instructor_name' }),
      ]),
    )
  })
})
