import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'

import BeautyChat from '../components/common/BeautyChat'
import { PageLoader } from '../components/common/Spinner'
import Footer from '../components/layout/Footer'
import Header from '../components/layout/Header'

function ScrollToTopOnNavigate() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function MainLayout() {
  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="sr-only z-50 bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <ScrollToTopOnNavigate />
      <Header />
      <main id="main-content" className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <BeautyChat />
    </div>
  )
}
