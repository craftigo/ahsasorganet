import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Public Pages
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import FundCollectionPage from './pages/FundCollectionPage';
import CommitteesPage from './pages/CommitteesPage';
import MembershipPage from './pages/MembershipPage';
import NotificationsPage from './pages/NotificationsPage';
import ProgramsPage from './pages/ProgramsPage';
import HelpPage from './pages/HelpPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import EduDayPage from './pages/EduDayPage';
import EduDayRegisterPage from './pages/EduDayRegisterPage';

// Protected Pages
import { UnitDashboardPage } from './pages/UnitDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminEduDayRegistrationsPage } from './pages/AdminEduDayRegistrationsPage';

export default function App(): JSX.Element {
  return (
    <Router>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              {/* Public Routes */}
              <Route index element={<HomePage />} />
              <Route path="edu-day" element={<EduDayPage />} />
              <Route path="edu-day/register" element={<EduDayRegisterPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="fund-collection" element={<FundCollectionPage />} />
              <Route path="committees" element={<CommitteesPage />} />
              <Route path="membership" element={<MembershipPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="programs" element={<ProgramsPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />

              {/* Protected Unit Route */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute requireUnit>
                    <UnitDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Routes */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/edu-day-registrations"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminEduDayRegistrationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </Router>
  );
}
