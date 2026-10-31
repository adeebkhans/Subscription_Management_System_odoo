import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { PublicOnly, RequireAuth, RequireRole } from './auth/guards';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ui/Toast';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { SignupPage } from './pages/auth/SignupPage';
import { CatalogPage } from './pages/catalog/CatalogPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { DiscountsPage } from './pages/discounts/DiscountsPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PaymentTermsPage } from './pages/payment-terms/PaymentTermsPage';
import { PlansPage } from './pages/plans/PlansPage';
import { CustomerPortalPage } from './pages/portal/CustomerPortalPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { QuotationsPage } from './pages/quotations/QuotationsPage';
import { StaffPage } from './pages/staff/StaffPage';
import { SubscriptionDetailPage } from './pages/subscriptions/SubscriptionDetailPage';
import { SubscriptionsPage } from './pages/subscriptions/SubscriptionsPage';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicOnly />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/app" element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route
                  path="subscriptions"
                  element={
                    <RequireRole roles={['ADMIN', 'STAFF']}>
                      <SubscriptionsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="subscriptions/:id"
                  element={
                    <RequireRole roles={['ADMIN', 'STAFF']}>
                      <SubscriptionDetailPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="quotations"
                  element={
                    <RequireRole roles={['ADMIN', 'STAFF']}>
                      <QuotationsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="payment-terms"
                  element={
                    <RequireRole roles={['ADMIN', 'STAFF']}>
                      <PaymentTermsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="invoices"
                  element={
                    <RequireRole roles={['ADMIN', 'STAFF']}>
                      <InvoicesPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="discounts"
                  element={
                    <RequireRole roles={['ADMIN']}>
                      <DiscountsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="portal"
                  element={
                    <RequireRole roles={['CUSTOMER']}>
                      <CustomerPortalPage />
                    </RequireRole>
                  }
                />
                <Route path="catalog" element={<CatalogPage />} />
                <Route
                  path="products"
                  element={
                    <RequireRole roles={['ADMIN', 'STAFF']}>
                      <ProductsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="plans"
                  element={
                    <RequireRole roles={['ADMIN', 'STAFF']}>
                      <PlansPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="users"
                  element={
                    <RequireRole roles={['ADMIN']}>
                      <StaffPage />
                    </RequireRole>
                  }
                />
                <Route path="forbidden" element={<ForbiddenPage />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
