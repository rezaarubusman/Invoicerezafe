import type { ReactNode } from "react";
import { Link } from "react-router";

interface AuthShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
  footer?: ReactNode;
}

export function AuthShell({
  children,
  title,
  description,
  footer,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-2xl border bg-background shadow-sm md:grid-cols-[0.85fr_1.15fr]">
          <div className="hidden bg-primary p-8 text-primary-foreground md:flex md:flex-col md:justify-between">
            <div>
              <Link to="/" className="text-xl font-bold tracking-tight">
                Fakturia
              </Link>

              <div className="mt-16 max-w-xs">
                <p className="text-sm font-medium opacity-80">
                  Simple invoicing
                </p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight">
                  Keep your invoices moving.
                </h2>
                <p className="mt-4 text-sm leading-6 opacity-75">
                  Manage clients, products, invoices, and payments in one
                  place.
                </p>
              </div>
            </div>

            <p className="text-xs opacity-60">
              © {new Date().getFullYear()} Fakturia
            </p>
          </div>

          <div className="p-6 sm:p-9">
            <div className="mb-7">
              <Link
                to="/"
                className="text-lg font-bold tracking-tight md:hidden"
              >
                Fakturia
              </Link>

              {title && (
                <h1 className="mt-5 text-2xl font-semibold tracking-tight md:mt-0">
                  {title}
                </h1>
              )}

              {description && (
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              )}
            </div>

            {children}

            {footer && (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}