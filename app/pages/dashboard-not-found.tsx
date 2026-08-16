import { Link } from "react-router";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "~/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="size-8 text-muted-foreground" />
        </div>

        <p className="text-7xl font-bold tracking-tight">404</p>

        <h1 className="mt-4 text-2xl font-semibold">
          Page not found
        </h1>

        <p className="mt-2 text-muted-foreground">
          Sorry, the page you are looking for does not exist or may have
          been moved.
        </p>

        <Button asChild className="mt-6">
          <Link to="/dashboard">
            <ArrowLeft />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </main>
  );
}