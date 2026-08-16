import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import { AppStoreProvider } from "~/store/app-store";
import { Toaster } from "sonner";

export const meta: Route.MetaFunction = () => [
  { title: "Invoice Management" },
  { name: "description", content: "Invoice Management is a platform for managing clients, products, services, and invoices." },
];

export const links: Route.LinksFunction = () => [
  {
    rel: "icon",
    type: "image/png",
    href: "/receipt-text.png",
  },
  {
    rel: "preconnect",
    href: "https://fonts.googleapis.com",
  },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />

        <Meta />
        <Links />
      </head>

      <body>
        {children}

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <Outlet />
      <Toaster position="bottom-right" richColors />
    </AppStoreProvider>
  );
}

export function ErrorBoundary({
  error,
}: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold">
            {error.status}
          </h1>

          <p className="mt-2 text-muted-foreground">
            {error.statusText || "Something went wrong."}
          </p>
        </div>
      </main>
    );
  }

  if (import.meta.env.DEV && error instanceof Error) {
    return (
      <main className="pt-16 p-4 container mx-auto">
        <h1>Application Error</h1>

        <p>{error.message}</p>

        {error.stack && (
          <pre className="mt-4 w-full overflow-x-auto rounded-lg bg-muted p-4">
            <code>{error.stack}</code>
          </pre>
        )}
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold">
          Something went wrong
        </h1>

        <p className="mt-2 text-muted-foreground">
          An unexpected error occurred.
        </p>
      </div>
    </main>
  );
}