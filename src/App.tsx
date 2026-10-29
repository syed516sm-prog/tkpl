import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TournamentProvider } from './modules/core/context/TournamentContext';
import { Navbar } from './modules/core/components/Navbar';
import { Footer } from './modules/core/components/Footer';
import { ScrollToTop } from './modules/core/components/ScrollToTop';
import { StadiumBackground } from './modules/core/components/StadiumBackground';
import { HomePage } from './modules/registration/pages/HomePage';
import { RegisterPage } from './modules/registration/pages/RegisterPage';
import { ReceiptPage } from './modules/registration/pages/ReceiptPage';
import { CheckStatusPage } from './modules/registration/pages/CheckStatusPage';
import { PolicyPage } from './modules/legal/pages/PolicyPage';
import { AdminLoginPage } from './modules/admin/pages/AdminLoginPage';
import { AdminLayout } from './modules/admin/components/AdminLayout';
import { AdminOverviewPage } from './modules/admin/pages/AdminOverviewPage';
import { AdminPlayersPage } from './modules/players/pages/AdminPlayersPage';
import { AdminPlayerDetailPage } from './modules/players/pages/AdminPlayerDetailPage';
import { AdminPaymentsPage } from './modules/payments/pages/AdminPaymentsPage';
import { AdminSettingsPage } from './modules/settings/pages/AdminSettingsPage';

export const App: React.FC = () => {
  return (
    <TournamentProvider>
      <BrowserRouter>
        <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden text-zinc-100">
          <StadiumBackground />
          <ScrollToTop />
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/receipt" element={<ReceiptPage />} />
              {/* Old bookmark from the UTR flow. */}
              <Route path="/registration-success" element={<Navigate to="/receipt" replace />} />
              <Route path="/find-ticket" element={<CheckStatusPage />} />
              <Route path="/check-status" element={<CheckStatusPage />} />
              <Route path="/policies" element={<Navigate to="/policies/terms" replace />} />
              <Route path="/policies/:slug" element={<PolicyPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="players" element={<AdminPlayersPage />} />
                <Route path="players/:id" element={<AdminPlayerDetailPage />} />
                <Route path="payments" element={<AdminPaymentsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TournamentProvider>
  );
};

export default App;
