import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getStoredUser } from '../../features/auth/services/auth.service';

interface Props {
  children: ReactNode;
}

// Re-checked on every render, including browser back/forward navigation
// (React Router re-renders the matched route on popstate) — so navigating
// back to a protected page after logout redirects to /login instead of
// showing stale UI from before the token was cleared.
export function RequireAuth({ children }: Props) {
  const user = getStoredUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
