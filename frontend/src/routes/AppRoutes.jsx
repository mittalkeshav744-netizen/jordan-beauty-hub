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
const WishlistPage = lazy(() => import('../pages/account/WishlistPage'))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'))
const OrderConfirmedPage = lazy(() => import('../pages/OrderConfirmedPage'))
const PolicyPage = lazy(() => import('../pages/PolicyPage'))
const SkinQuizPage = lazy(() => import('../pages/SkinQuizPage'))
const LooksPage = lazy(() => import('../pages/LooksPage'))
const LookDetailPage = lazy(() => import('../pages/LookDetailPage'))
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
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password/:uid/:token" element={<ResetPasswordPage />} />
        <Route path="policies/:slug" element={<PolicyPage />} />
        <Route path="skin-quiz" element={<SkinQuizPage />} />
        <Route path="looks" element={<LooksPage />} />
        <Route path="looks/:slug" element={<LookDetailPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order-confirmed/:number" element={<OrderConfirmedPage />} />
          <Route path="account" element={<AccountLayout />}>
            <Route index element={<AccountPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:number" element={<OrderDetailPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
