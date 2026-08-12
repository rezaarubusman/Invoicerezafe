import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { DashboardLayout } from "~/components/layout/dashboard-layout";
import { useAuthStore } from "~/store/auth-store";

export default function DashboardLayoutRoute() {
  const location = useLocation();
  const accessToken = useAuthStore(
    (state) => state.accessToken
  );
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated
  );
  const getCurrentUser = useAuthStore(
    (state) => state.getCurrentUser
  );
  const clearAuth = useAuthStore(
    (state) => state.clearAuth
  );
  const [checked, setChecked] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    const validateSession = async () => {
      if (!accessToken) {
        setChecked(true);
        return;
      }

      try {
        await getCurrentUser();
      } catch {
        clearAuth();
      } finally {
        if (!cancelled) {
          setChecked(true);
        }
      }
    };

    validateSession();

    return () => {
      cancelled = true;
    };
  }, [accessToken, clearAuth, getCurrentUser]);

  if (!checked) {
    return null;
  }

  if (!accessToken || !isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
