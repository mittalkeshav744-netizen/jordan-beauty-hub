import { Navigate, useParams } from 'react-router'

/** Deep link: open the customers list with this customer’s popup. */
export default function CustomerDetailPage() {
  const { id } = useParams()
  if (!id) return <Navigate to="/manage/customers" replace />
  return <Navigate to={`/manage/customers/${id}`} replace />
}
