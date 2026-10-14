import { lazy } from 'react'
import { Route, Routes } from 'react-router'

import MainLayout from '../layouts/MainLayout'
import HomePage from '../pages/HomePage'
import ProtectedRoute from './ProtectedRoute'

// Pages outside the landing page are code-split and loaded on demand.
const ShopPage = lazy(() => import('../pages/ShopPage'))
const ProductDetailPage = lazy(() => import('../pages/ProductDetailPage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const RegisterPage = lazy(() => import('../pages/RegisterPage'))
const CartPage = lazy(() => import('../pages/CartPage'))
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'))
const AccountLayout = lazy(() => import('../layouts/AccountLayout'))
const AccountPage = lazy(() => import('../pages/account/AccountPage'))
const OrdersPage = lazy(() => import('../pages/account/OrdersPage'))
const OrderDetailPage = lazy(() => import('../pages/account/OrderDetailPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="account" element={<AccountLayout />}>
            <Route index element={<AccountPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:number" element={<OrderDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
