import { Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import RouteErrorFallback from '../components/common/RouteErrorFallback'
import { PageLoader } from '../components/common/Spinner'
import { useAuth } from '../hooks/useAuth'

/** Staff-only gate for the owner portal (`user.is_staff`). */
export default function StaffRoute() {
  const { user, isAuthenticated, isCheckingSession } = useAuth()
  const location = useLocation()

  if (isCheckingSession) return <PageLoader />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (!user?.is_staff) {
    return <Navigate to="/" replace />
  }
  return (
    <RouteErrorFallback>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </RouteErrorFallback>
  )
}
