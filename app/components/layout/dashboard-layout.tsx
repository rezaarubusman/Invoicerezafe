import type { ReactNode } from "react";
import { BrandMark, SidebarNav } from "./sidebar-nav";
import { DashboardHeader } from "./dashboard-header";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="border-b border-sidebar-border p-4">
          <BrandMark />
        </div>
        <SidebarNav />
        <div className="mt-auto p-4">
          <div className="rounded-xl border border-sidebar-border bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Demo workspace</p>
            <p className="mt-1 text-xs text-muted-foreground">
              All data on this prototype is local sample data.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
