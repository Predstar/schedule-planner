import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ConfirmEmailPage } from '../features/auth/pages/ConfirmEmailPage';
import { ManagerDashboardPage } from '../features/schedules/pages/ManagerDashboardPage';
import { ManagerWeeklySchedulePage } from '../features/schedules/pages/ManagerWeeklySchedulePage';
import { ManagerTeamPage } from '../features/employees/pages/ManagerTeamPage';
import { AvailabilityPage } from '../features/availability/pages/AvailabilityPage';
import { ProfilePage } from '../features/profile/pages/ProfilePage';
import { EmployeeShiftsPage } from '../features/shifts/pages/EmployeeShiftsPage';
import { EmployeeSwapsPage } from '../features/swaps/pages/EmployeeSwapsPage';
import { ManagerSwapsPage } from '../features/swaps/pages/ManagerSwapsPage';
import { AlertsPage } from '../features/notifications/pages/AlertsPage';
import { RequireAuth } from '../shared/components/RequireAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/confirm" element={<ConfirmEmailPage />} />

        {/* Manager routes */}
        <Route path="/manager/schedule"     element={<RequireAuth><ManagerDashboardPage /></RequireAuth>} />
        <Route path="/manager/team"         element={<RequireAuth><ManagerTeamPage /></RequireAuth>} />
        <Route path="/manager/weekly"       element={<RequireAuth><ManagerWeeklySchedulePage /></RequireAuth>} />
        <Route path="/manager/availability" element={<RequireAuth><AvailabilityPage role="manager" /></RequireAuth>} />

        <Route path="/manager/requests" element={<RequireAuth><ManagerSwapsPage /></RequireAuth>} />
        <Route path="/manager/alerts"   element={<RequireAuth><AlertsPage role="manager" /></RequireAuth>} />

        {/* Placeholder manager routes */}
        <Route path="/manager/profile"  element={<RequireAuth><ProfilePage role="manager" /></RequireAuth>} />

        {/* Employee routes */}
        <Route path="/employee/availability" element={<RequireAuth><AvailabilityPage role="employee" /></RequireAuth>} />

        {/* Placeholder employee routes */}
        <Route path="/employee/shifts"   element={<RequireAuth><EmployeeShiftsPage /></RequireAuth>} />
        <Route path="/employee/swaps"    element={<RequireAuth><EmployeeSwapsPage /></RequireAuth>} />
        <Route path="/employee/alerts"   element={<RequireAuth><AlertsPage role="employee" /></RequireAuth>} />
        <Route path="/employee/profile"  element={<RequireAuth><ProfilePage role="employee" /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
    </QueryClientProvider>
  );
}
