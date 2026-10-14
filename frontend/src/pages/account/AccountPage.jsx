import { useState } from 'react'

import Button from '../../components/common/Button'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import EmptyState from '../../components/common/EmptyState'
import ErrorMessage from '../../components/common/ErrorMessage'
import Skeleton from '../../components/common/Skeleton'
import AddressForm from '../../components/forms/AddressForm'
import FormField from '../../components/forms/FormField'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { useForm } from '../../hooks/useForm'
import { useToast } from '../../hooks/useToast'
import { addressService } from '../../services/authService'
import { getErrorMessage } from '../../utils/errors'
import { required, validPhone } from '../../utils/validators'

function ProfileSection() {
  const { user, updateProfile } = useAuth()
  const { showToast } = useToast()
  const form = useForm(
    { first_name: user.first_name, last_name: user.last_name, phone: user.phone ?? '' },
    (values) => ({
      first_name: required(values.first_name, 'First name'),
      phone: values.phone ? validPhone(values.phone) : '',
    }),
  )

  const submit = async (values) => {
    await updateProfile(values)
    showToast('Profile updated.')
  }

  return (
    <section aria-labelledby="profile-heading" className="space-y-4">
      <h2 id="profile-heading" className="text-sm font-semibold tracking-widest uppercase">
        Profile
      </h2>
      <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-4 sm:grid-cols-3">
        {form.formError && (
          <div className="sm:col-span-3">
            <ErrorMessage message={form.formError} />
          </div>
        )}
        <FormField label="First name" required {...form.field('first_name')} />
        <FormField label="Last name" {...form.field('last_name')} />
        <FormField label="Phone" type="tel" {...form.field('phone')} />
        <div>
          <Button type="submit" isLoading={form.isSubmitting}>
            Save profile
          </Button>
        </div>
      </form>
    </section>
  )
}

function AddressCard({ address, onEdit, onDelete }) {
  return (
    <li className="flex flex-col gap-3 rounded-card border border-line p-4 text-sm">
      <div>
        <p className="font-semibold">
          {address.full_name}
          {address.is_default && (
            <span className="ml-2 rounded-control bg-accent-soft px-2 py-0.5 text-[0.65rem] font-semibold text-accent uppercase">
              Default
            </span>
          )}
        </p>
        <p className="text-ink-soft">
          {address.line1}
          {address.line2 && `, ${address.line2}`}
        </p>
        <p className="text-ink-soft">
          {address.city}, {address.state} {address.postal_code}
        </p>
        <p className="text-muted">Phone: {address.phone}</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(address)}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(address)}>
          Delete
        </Button>
      </div>
    </li>
  )
}

function AddressSection() {
  const { showToast } = useToast()
  const { data: addresses, isLoading, error, reload } = useApi(() => addressService.list())
  const [editing, setEditing] = useState(null) // null | 'new' | address object
  const [addressToDelete, setAddressToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const saveAddress = async (values) => {
    if (editing === 'new') {
      await addressService.create(values)
      showToast('Address added.')
    } else {
      await addressService.update(editing.id, values)
      showToast('Address updated.')
    }
    setEditing(null)
    reload()
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      await addressService.remove(addressToDelete.id)
      showToast('Address deleted.')
      reload()
    } catch (requestError) {
      showToast(getErrorMessage(requestError), 'error')
    } finally {
      setIsDeleting(false)
      setAddressToDelete(null)
    }
  }

  return (
    <section aria-labelledby="addresses-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="addresses-heading" className="text-sm font-semibold tracking-widest uppercase">
          Saved addresses
        </h2>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing('new')}>
            + Add address
          </Button>
        )}
      </div>

      {editing && (
        <div className="rounded-card border border-line p-4 sm:p-5">
          <AddressForm
            key={editing === 'new' ? 'new' : editing.id}
            initialValues={editing === 'new' ? undefined : editing}
            onSubmit={saveAddress}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {isLoading && <Skeleton className="h-32 w-full" />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {addresses && addresses.length === 0 && !editing && (
        <EmptyState title="No saved addresses" message="Add an address to check out faster." />
      )}
      {addresses && addresses.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} onEdit={setEditing} onDelete={setAddressToDelete} />
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={Boolean(addressToDelete)}
        title="Delete address?"
        message="This address will be removed from your account. Past orders keep their delivery details."
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setAddressToDelete(null)}
      />
    </section>
  )
}

export default function AccountPage() {
  return (
    <div className="space-y-10">
      <ProfileSection />
      <AddressSection />
    </div>
  )
}
