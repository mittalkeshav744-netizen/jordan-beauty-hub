import { INDIAN_STATES } from '../../constants/navigation'
import { useForm } from '../../hooks/useForm'
import { required, validPhone, validPinCode } from '../../utils/validators'
import Button from '../common/Button'
import ErrorMessage from '../common/ErrorMessage'
import FormField from './FormField'

const EMPTY_ADDRESS = {
  full_name: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  is_default: false,
}

function validateAddress(values) {
  return {
    full_name: required(values.full_name, 'Full name'),
    phone: required(values.phone, 'Phone') || validPhone(values.phone),
    line1: required(values.line1, 'Address'),
    city: required(values.city, 'City'),
    state: required(values.state, 'State'),
    postal_code: required(values.postal_code, 'PIN code') || validPinCode(values.postal_code),
  }
}

export default function AddressForm({ initialValues, onSubmit, onCancel, submitLabel = 'Save address' }) {
  const form = useForm({ ...EMPTY_ADDRESS, ...initialValues }, validateAddress)

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      {form.formError && (
        <div className="sm:col-span-2">
          <ErrorMessage message={form.formError} />
        </div>
      )}
      <FormField label="Full name" autoComplete="name" required {...form.field('full_name')} />
      <FormField label="Phone" type="tel" autoComplete="tel" required {...form.field('phone')} />
      <FormField
        label="Address line 1"
        autoComplete="address-line1"
        className="sm:col-span-2"
        required
        {...form.field('line1')}
      />
      <FormField
        label="Address line 2"
        autoComplete="address-line2"
        className="sm:col-span-2"
        {...form.field('line2')}
      />
      <FormField label="City" autoComplete="address-level2" required {...form.field('city')} />
      <FormField label="State" as="select" required {...form.field('state')}>
        <option value="">Select a state</option>
        {INDIAN_STATES.map((state) => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </FormField>
      <FormField
        label="PIN code"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        required
        {...form.field('postal_code')}
      />
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm sm:self-end">
        <input
          type="checkbox"
          name="is_default"
          checked={Boolean(form.values.is_default)}
          onChange={(event) => form.setValue('is_default', event.target.checked)}
          className="h-4 w-4 shrink-0 accent-accent"
        />
        Make this my default address
      </label>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <Button type="submit" isLoading={form.isSubmitting}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
