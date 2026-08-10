import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-xl border bg-background p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

