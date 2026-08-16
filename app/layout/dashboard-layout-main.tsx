import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router"; 
import { DashboardLayout } from "~/components/layout/dashboard-layout";
import { useAuthStore } from "~/store/auth-store";
import { axiosInstance } from "~/lib/axios"; 

export default function DashboardLayoutRoute() {
  const location = useLocation();
  
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setAuth = useAuthStore((state) => state.setAuth); 

  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const validateSession = async () => {
      if (!accessToken) {
        if (!cancelled) setChecked(true);
        return;
      }

      try {
        const response = await axiosInstance.get("/auth/me");
        
        if (!cancelled && response.data?.user) {
          setAuth(response.data.user, accessToken);
        }
      } catch (error) {
        console.error("Session validation failed:", error);
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) setChecked(true);
      }
    };

    validateSession();

    return () => {
      cancelled = true;
    };
    
  }, [accessToken]); 

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