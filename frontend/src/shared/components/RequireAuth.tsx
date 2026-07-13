import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getStoredUser } from '../../features/auth/services/auth.service';

interface Props {
  children: ReactNode;
}

// Some browsers restore a page from the back-forward cache (bfcache) on
// history navigation without re-running JS at all, repainting the exact DOM
// from before logout. Forcing a real reload on a bfcache restore guarantees
// RequireAuth's check below actually runs again instead of being skipped.
function useBfcacheReload() {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        window.location.reload();
      }
    }
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);
}

// Re-checked on every render, including browser back/forward navigation
// (React Router re-renders the matched route on popstate) — so navigating
// back to a protected page after logout redirects to /login instead of
// showing stale UI from before the token was cleared.
export function RequireAuth({ children }: Props) {
  useBfcacheReload();
  const user = getStoredUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
