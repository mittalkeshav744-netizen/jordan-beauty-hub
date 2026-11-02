import { Navigate, useParams } from 'react-router'

/** Deep link: open the orders list with this order’s popup. */
export default function OrderDetailPage() {
  const { number } = useParams()
  if (!number) return <Navigate to="/manage/orders" replace />
  return <Navigate to={`/manage/orders/${number}`} replace />
}
