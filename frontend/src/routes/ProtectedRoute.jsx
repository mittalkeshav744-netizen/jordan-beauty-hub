import { Navigate, Outlet, useLocation } from 'react-router'

import { PageLoader } from '../components/common/Spinner'
import { useAuth } from '../hooks/useAuth'

/** Sends signed-out visitors to /login and brings them back afterwards. */
export default function ProtectedRoute() {
  const { isAuthenticated, isCheckingSession } = useAuth()
  const location = useLocation()

  if (isCheckingSession) return <PageLoader />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
