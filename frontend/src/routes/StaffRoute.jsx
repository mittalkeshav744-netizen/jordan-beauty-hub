import { Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import RouteErrorFallback from '../components/common/RouteErrorFallback'
import { PageLoader } from '../components/common/Spinner'
import { useAuth } from '../hooks/useAuth'

/** Staff-only gate for the owner portal (`user.is_staff`). */
export default function StaffRoute() {
  const { user, isAuthenticated, isCheckingSession } = useAuth()
  const location = useLocation()
  const isPublicCertVerify =
    location.pathname === '/certificate/verify' ||
    location.pathname.startsWith('/certificate/verify/')

  if (isCheckingSession) return <PageLoader />
  const from = location.pathname + location.search
  // Authenticity checks (QR / serial) stay public; CertificateLayout strips staff chrome.
  if (!isAuthenticated && !isPublicCertVerify) {
    return <Navigate to="/manage/login" replace state={{ from }} />
  }
  if (isAuthenticated && !user?.is_staff && !isPublicCertVerify) {
    return <Navigate to="/manage/login" replace state={{ from }} />
  }
  return (
    <RouteErrorFallback>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </RouteErrorFallback>
  )
}
