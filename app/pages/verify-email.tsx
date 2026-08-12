import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "~/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { useAuthStore } from "~/store/auth-store";

export function meta() {
  return [
    { title: "Verify your email - Fakturia" },
    {
      name: "description",
      content: "Confirm your email address to activate your workspace.",
    },
    {
      property: "og:title",
      content: "Verify your email - Fakturia",
    },
    {
      property: "og:description",
      content: "Confirm your email address to start invoicing.",
    },
  ];
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const initialEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<
    "pending" | "verified" | "resent" | "error"
  >("pending");

  const verifyEmail = useAuthStore(
    (state) => state.verifyEmail
  );

  const resendVerification = useAuthStore(
    (state) => state.resendVerification
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const response = await verifyEmail(token);

        if (cancelled) {
          return;
        }

        setStatus("verified");
        toast.success(response.message);
      } catch (error: any) {
        if (cancelled) {
          return;
        }

        const message =
          error?.response?.data?.message ||
          "Email verification failed";

        setStatus("error");
        toast.error(message);
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [token, verifyEmail]);

  const handleResend = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }

    try {
      const response = await resendVerification(email);

      setStatus("resent");
      toast.success(response.message);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Failed to resend verification email";

      setStatus("error");
      toast.error(message);
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      description="Use the verification link from your inbox to activate your account."
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
          {status === "verified"
            ? "Email verified"
            : "Verification pending"}
        </p>

        <p className="text-sm text-muted-foreground">
          {status === "verified"
            ? "You can now log in to your account."
            : "Check your inbox for the verification link."}
        </p>
      </div>

      {status === "resent" ? (
        <Alert>
          <AlertTitle>Verification email resent</AlertTitle>
          <AlertDescription>
            Check your inbox for the latest verification link.
          </AlertDescription>
        </Alert>
      ) : null}

      {status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Verification failed</AlertTitle>
          <AlertDescription>
            The link may be invalid or expired. Request a new one below.
          </AlertDescription>
        </Alert>
      ) : null}

      {status !== "verified" ? (
        <>
          <Field>
            <FieldLabel htmlFor="email">
              Email
            </FieldLabel>

            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@company.id"
            />
          </Field>

          <Button
            className="w-full"
            variant="outline"
            onClick={handleResend}
            disabled={isLoading}
          >
            {isLoading
              ? "Sending..."
              : "Resend verification email"}
          </Button>
        </>
      ) : null}

      <Button asChild className="w-full">
        <Link to="/login">Back to login</Link>
      </Button>
    </AuthShell>
  );
}
