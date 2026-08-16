import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-muted/30 px-5">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center">
        <div className="w-full max-w-xl">
          <p className="mb-3 text-sm font-semibold tracking-wide text-primary">
            FAKTURIA
          </p>

          <h1 className="max-w-lg text-4xl font-semibold tracking-tight sm:text-5xl">
            Invoicing without the unnecessary hassle.
          </h1>

          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
            Create invoices, manage your clients, and keep your billing
            organized in one simple place.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/register">
                Create an account
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Simple tools for keeping your business moving.
          </p>
        </div>
      </div>
    </main>
  );
}