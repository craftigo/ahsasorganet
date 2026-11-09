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
import QuizPage from './pages/QuizPage';
import ParentMeetRegistrationPage from './pages/ParentMeetRegistrationPage';
import ParentMeetPassPage from './pages/ParentMeetPassPage';
import ParentMeetEventInfoPage from './pages/ParentMeetEventInfoPage';
import ParentMeetDisplayPage from './pages/ParentMeetDisplayPage';
import ExpoScannerPage from './pages/scanners/ExpoScannerPage';
import MeetingScannerPage from './pages/scanners/MeetingScannerPage';
import FoodScannerPage from './pages/scanners/FoodScannerPage';

// Protected Pages
import { UnitDashboardPage } from './pages/UnitDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminQuizSubmissionsPage } from './pages/AdminQuizSubmissionsPage';
import AdminParentMeetPage from './pages/AdminParentMeetPage';

export default function App(): JSX.Element {
  return (
    <Router>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            {/* Standalone Display & Scanner Screens (No outer navbar/footer wrappers) */}
            <Route path="/event/display" element={<ParentMeetDisplayPage />} />
            <Route path="/scanner/expo" element={<ExpoScannerPage />} />
            <Route path="/scanner/meeting" element={<MeetingScannerPage />} />
            <Route path="/scanner/food" element={<FoodScannerPage />} />
            <Route path="/event/pass/:token" element={<ParentMeetPassPage />} />

            <Route path="/" element={<MainLayout />}>
              {/* Public Routes */}
              <Route index element={<HomePage />} />
              <Route path="quiz" element={<QuizPage />} />
              <Route path="event/edu-familia" element={<ParentMeetRegistrationPage />} />
              <Route path="event/register" element={<ParentMeetRegistrationPage />} />
              <Route path="event/info" element={<ParentMeetEventInfoPage />} />
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

              {/* Protected Admin Route */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/quiz-submissions"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminQuizSubmissionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/parent-meet"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminParentMeetPage />
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
