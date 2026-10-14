import { BrowserRouter } from 'react-router'

import AuthProvider from './context/AuthProvider'
import CartProvider from './context/CartProvider'
import ToastProvider from './context/ToastProvider'
import AppRoutes from './routes/AppRoutes'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
