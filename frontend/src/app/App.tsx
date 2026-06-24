import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ManagerDashboardPage } from '../features/schedules/pages/ManagerDashboardPage';
import { ManagerTeamPage } from '../features/employees/pages/ManagerTeamPage';
import { AvailabilityPage } from '../features/availability/pages/AvailabilityPage';
import { ProfilePage } from '../features/profile/pages/ProfilePage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Manager routes */}
        <Route path="/manager/schedule"     element={<ManagerDashboardPage />} />
        <Route path="/manager/team"         element={<ManagerTeamPage />} />
        <Route path="/manager/availability" element={<AvailabilityPage role="manager" />} />

        {/* Placeholder manager routes */}
        <Route path="/manager/requests" element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>Requests — coming soon</div>} />
        <Route path="/manager/profile"  element={<ProfilePage role="manager" />} />

        {/* Employee routes */}
        <Route path="/employee/availability" element={<AvailabilityPage role="employee" />} />

        {/* Placeholder employee routes */}
        <Route path="/employee/shifts"   element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>My Shifts — coming soon</div>} />
        <Route path="/employee/swaps"    element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>Swaps — coming soon</div>} />
        <Route path="/employee/alerts"   element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>Alerts — coming soon</div>} />
        <Route path="/employee/profile"  element={<ProfilePage role="employee" />} />
      </Routes>
    </BrowserRouter>
  );
}
