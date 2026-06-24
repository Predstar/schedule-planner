import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ManagerDashboardPage } from '../features/schedules/pages/ManagerDashboardPage';
import { ManagerTeamPage } from '../features/employees/pages/ManagerTeamPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Manager routes */}
        <Route path="/manager/schedule" element={<ManagerDashboardPage />} />
        <Route path="/manager/team"     element={<ManagerTeamPage />} />

        {/* Placeholder routes — pages to be built next */}
        <Route path="/manager/requests"     element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>Requests — coming soon</div>} />
        <Route path="/manager/availability" element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>Availability — coming soon</div>} />
        <Route path="/manager/profile"      element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>Profile — coming soon</div>} />

        <Route path="/employee/shifts"        element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>My Shifts — coming soon</div>} />
        <Route path="/employee/availability"  element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>Availability — coming soon</div>} />
        <Route path="/employee/swaps"         element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>Swaps — coming soon</div>} />
        <Route path="/employee/alerts"        element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>Alerts — coming soon</div>} />
        <Route path="/employee/profile"       element={<div style={{padding:40,fontFamily:'Inter',color:'#6B4F2A'}}>Profile — coming soon</div>} />
      </Routes>
    </BrowserRouter>
  );
}
