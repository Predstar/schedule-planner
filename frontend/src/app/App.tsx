import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/confirm" element={<ConfirmEmailPage />} />

        {/* Manager routes */}
        <Route path="/manager/schedule"     element={<ManagerDashboardPage />} />
        <Route path="/manager/team"         element={<ManagerTeamPage />} />
        <Route path="/manager/weekly"       element={<ManagerWeeklySchedulePage />} />
        <Route path="/manager/availability" element={<AvailabilityPage role="manager" />} />

        <Route path="/manager/requests" element={<ManagerSwapsPage />} />

        {/* Placeholder manager routes */}
        <Route path="/manager/profile"  element={<ProfilePage role="manager" />} />

        {/* Employee routes */}
        <Route path="/employee/availability" element={<AvailabilityPage role="employee" />} />

        {/* Placeholder employee routes */}
        <Route path="/employee/shifts"   element={<EmployeeShiftsPage />} />
        <Route path="/employee/swaps"    element={<EmployeeSwapsPage />} />
        <Route path="/employee/alerts"   element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>Alerts — coming soon</div>} />
        <Route path="/employee/profile"  element={<ProfilePage role="employee" />} />
      </Routes>
    </BrowserRouter>
  );
}
