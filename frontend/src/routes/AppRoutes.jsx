import { lazy } from 'react'
import { Route, Routes } from 'react-router'

import MainLayout from '../layouts/MainLayout'
import HomePage from '../pages/HomePage'
import ProtectedRoute from './ProtectedRoute'
import StaffRoute from './StaffRoute'

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
const VerifyEmailPage = lazy(() => import('../pages/VerifyEmailPage'))
const OrderConfirmedPage = lazy(() => import('../pages/OrderConfirmedPage'))
const PolicyPage = lazy(() => import('../pages/PolicyPage'))
const SkinQuizPage = lazy(() => import('../pages/SkinQuizPage'))
const LooksPage = lazy(() => import('../pages/LooksPage'))
const LookDetailPage = lazy(() => import('../pages/LookDetailPage'))
const CoursesPage = lazy(() => import('../pages/CoursesPage'))
const CourseDetailPage = lazy(() => import('../pages/CourseDetailPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

const ManageLayout = lazy(() => import('../layouts/ManageLayout'))
const ManageDashboardPage = lazy(() => import('../pages/manage/DashboardPage'))
const ManageOrdersPage = lazy(() => import('../pages/manage/OrdersPage'))
const ManageProductsPage = lazy(() => import('../pages/manage/ProductsPage'))
const ManageProductDetailPage = lazy(() => import('../pages/manage/ProductDetailPage'))
const ManageReviewsPage = lazy(() => import('../pages/manage/ReviewsPage'))
const ManageCouponsPage = lazy(() => import('../pages/manage/CouponsPage'))
const ManageCustomersPage = lazy(() => import('../pages/manage/CustomersPage'))
const ManageLooksPage = lazy(() => import('../pages/manage/LooksPage'))
const ManageCoursesPage = lazy(() => import('../pages/manage/CoursesPage'))
const ManageNewsletterPage = lazy(() => import('../pages/manage/NewsletterPage'))
const MyCoursesPage = lazy(() => import('../pages/account/MyCoursesPage'))
const ManageCategoriesPage = lazy(() => import('../pages/manage/CategoriesPage'))
const ManageStorefrontPage = lazy(() => import('../pages/manage/StorefrontPage'))
const ManageSettingsPage = lazy(() => import('../pages/manage/SettingsPage'))

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<StaffRoute />}>
        <Route path="manage" element={<ManageLayout />}>
          <Route index element={<ManageDashboardPage />} />
          <Route path="orders" element={<ManageOrdersPage />} />
          <Route path="orders/:number" element={<ManageOrdersPage />} />
          <Route path="products" element={<ManageProductsPage />} />
          <Route path="products/:id" element={<ManageProductDetailPage />} />
          <Route path="categories" element={<ManageCategoriesPage />} />
          <Route path="storefront" element={<ManageStorefrontPage />} />
          <Route path="reviews" element={<ManageReviewsPage />} />
          <Route path="coupons" element={<ManageCouponsPage />} />
          <Route path="customers" element={<ManageCustomersPage />} />
          <Route path="customers/:id" element={<ManageCustomersPage />} />
          <Route path="looks" element={<ManageLooksPage />} />
          <Route path="courses" element={<ManageCoursesPage />} />
          <Route path="newsletter" element={<ManageNewsletterPage />} />
          <Route path="settings" element={<ManageSettingsPage />} />
        </Route>
      </Route>

      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password/:uid/:token" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="policies/:slug" element={<PolicyPage />} />
        <Route path="skin-quiz" element={<SkinQuizPage />} />
        <Route path="looks" element={<LooksPage />} />
        <Route path="looks/:slug" element={<LookDetailPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:slug" element={<CourseDetailPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order-confirmed/:number" element={<OrderConfirmedPage />} />
          <Route path="account" element={<AccountLayout />}>
            <Route index element={<AccountPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:number" element={<OrderDetailPage />} />
            <Route path="courses" element={<MyCoursesPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
