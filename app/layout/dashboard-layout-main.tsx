import { Outlet } from "react-router";
import { DashboardLayout } from "~/components/layout/dashboard-layout";

export default function DashboardLayoutRoute() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}