import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AdminLayout from "../layouts/AdminLayout";
import UserDashboardLayout from "../layouts/UserDashboardLayout";
import VendorLayout from "../layouts/VendorLayout";
import ProtectedRoute from "../components/dashboard/ProtectedRoute";
import AdminRoute from "../components/dashboard/AdminRoute";
import VendorRoute from "../components/dashboard/VendorRoute";

// Lazy Loaded Pages
const Home = lazy(() => import("../pages/Home"));
const Products = lazy(() => import("../pages/ProductsPage"));
const ProductDetails = lazy(() => import("../pages/ProductDetails"));
const Cart = lazy(() => import("../pages/Cart"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const VerifyEmail = lazy(() => import("../pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const About = lazy(() => import("../pages/About"));
const Contact = lazy(() => import("../pages/Contact"));
const OrderDetails = lazy(() => import("../pages/OrderDetails"));
const Invoice = lazy(() => import("../pages/Invoice"));
const PaymentSuccess = lazy(() => import("../pages/PaymentSuccess"));
const PaymentFailed = lazy(() => import("../pages/PaymentFailed"));
const NotificationsPage = lazy(() => import("../pages/NotificationsPage"));
const StorePage = lazy(() => import("../pages/StorePage"));

const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminAnalytics = lazy(() => import("../pages/admin/AdminAnalytics"));
const AdminProducts = lazy(() => import("../pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("../pages/admin/AdminOrders"));
const AdminUsers = lazy(() => import("../pages/admin/AdminUsers"));
const AdminMessages = lazy(() => import("../pages/admin/AdminMessages"));
const AdminVendors = lazy(() => import("../pages/admin/AdminVendors"));
const AdminCatalog = lazy(() => import("../pages/admin/AdminCatalog"));

const VendorRegister = lazy(() => import("../pages/vendor/VendorRegister"));
const VendorDashboard = lazy(() => import("../pages/vendor/VendorDashboard"));
const VendorProducts = lazy(() => import("../pages/vendor/VendorProducts"));
const VendorOrders = lazy(() => import("../pages/vendor/VendorOrders"));

const UserDashboardHome = lazy(() => import("../pages/dashboard/UserDashboardHome"));
const DashboardProfile = lazy(() => import("../pages/dashboard/DashboardProfile"));
const DashboardOrders = lazy(() => import("../pages/dashboard/DashboardOrders"));
const DashboardWishlist = lazy(() => import("../pages/dashboard/DashboardWishlist"));
const DashboardAddresses = lazy(() => import("../pages/dashboard/DashboardAddresses"));

// Simple Loader/Skeleton for Suspense fallback
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const NotFound = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
    <h1 className="text-4xl font-bold">404</h1>
    <p className="text-gray-600">Page not found</p>
    <a href="/" className="text-blue-600 hover:underline">Back to home</a>
  </div>
);

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/store/:slug" element={<StorePage />} />
          <Route path="/notifications" element={
            <ProtectedRoute><NotificationsPage /></ProtectedRoute>
          } />
          <Route path="/vendor/register" element={
            <ProtectedRoute><VendorRegister /></ProtectedRoute>
          } />
          
          <Route path="/order/:orderId" element={
            <ProtectedRoute><OrderDetails /></ProtectedRoute>
          } />
          <Route path="/order/:orderId/invoice" element={
            <ProtectedRoute><Invoice /></ProtectedRoute>
          } />
          
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/failed" element={<PaymentFailed />} />

          <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
          <Route path="/my-orders" element={<Navigate to="/dashboard/orders" replace />} />
          <Route path="/wishlist" element={<Navigate to="/dashboard/wishlist" replace />} />
          <Route path="/addresses" element={<Navigate to="/dashboard/addresses" replace />} />
        </Route>

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <UserDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<UserDashboardHome />} />
          <Route path="orders" element={<DashboardOrders />} />
          <Route path="wishlist" element={<DashboardWishlist />} />
          <Route path="addresses" element={<DashboardAddresses />} />
          <Route path="profile" element={<DashboardProfile />} />
        </Route>

        <Route
          path="/vendor"
          element={
            <VendorRoute>
              <VendorLayout />
            </VendorRoute>
          }
        >
          <Route path="dashboard" element={<VendorDashboard />} />
          <Route path="products" element={<VendorProducts />} />
          <Route path="orders" element={<VendorOrders />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="vendors" element={<AdminVendors />} />
          <Route path="catalog" element={<AdminCatalog />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="messages" element={<AdminMessages />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
