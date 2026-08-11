import { Link, useSearchParams } from "react-router";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "~/components/auth/auth-shell";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

export function meta() {
  return [
    { title: "Verify your email — Fakturia" },
    {
      name: "description",
      content: "Confirm your email address to activate your workspace.",
    },
    {
      property: "og:title",
      content: "Verify your email — Fakturia",
    },
    {
      property: "og:description",
      content: "Confirm your email address to start invoicing.",
    },
  ];
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();

  const email = searchParams.get("email") ?? "";

  const [sent, setSent] = useState(false);

  const handleResend = () => {
    setSent(true);
    toast.success("Verification email resent");
  };

  return (
    <AuthShell
      title="Verify your email"
      description="We sent a verification link to your inbox."
      footer={
        <Link to="/login" className="hover:text-foreground">
          Back to login
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 p-6 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-warning-soft text-warning">
          <MailCheck className="size-6" aria-hidden />
        </span>

        <p className="text-sm font-medium text-foreground">
          Verification pending
        </p>

        <p className="text-sm text-muted-foreground">
          Sent to{" "}
          <span className="font-medium text-foreground">
            {email || "your email address"}
          </span>
        </p>
      </div>

      {sent ? (
        <Alert>
          <AlertTitle>Verification email resent</AlertTitle>

          <AlertDescription>
            This prototype does not send real email — the state above is for
            demonstration.
          </AlertDescription>
        </Alert>
      ) : null}

      <Button
        className="w-full"
        variant="outline"
        onClick={handleResend}
      >
        Resend verification email
      </Button>

      <Button asChild className="w-full">
        <Link to="/dashboard">Continue to dashboard</Link>
      </Button>
    </AuthShell>
  );
}