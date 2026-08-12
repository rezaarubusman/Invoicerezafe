import { Link } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AuthShell } from "~/components/auth/auth-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { forgotPasswordSchema } from "~/lib/validation";
import { useAuthStore } from "~/store/auth-store";

export function meta() {
  return [
    { title: "Reset your password — Fakturia" },
    {
      name: "description",
      content:
        "Request a password reset link for your Fakturia account.",
    },
    {
      property: "og:title",
      content: "Reset your password — Fakturia",
    },
    {
      property: "og:description",
      content: "Request a password reset link.",
    },
  ];
}

type Values = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const form = useForm<Values>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPassword = useAuthStore(
    (state) => state.forgotPassword
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading
  );

  const onSubmit = async (values: Values) => {
    try {
      const response =
        await forgotPassword(values);

      toast.success(response.message);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Failed to send reset link";

      toast.error(message);
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email and we'll send you a reset link."
      footer={
        <Link
          to="/login"
          className="hover:text-foreground"
        >
          Back to login
        </Link>
      }
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">
                Email <span className="text-destructive">*</span>
              </FieldLabel>

              <Input
                {...field}
                id="email"
                type="email"
                placeholder="you@company.id"
                aria-invalid={fieldState.invalid}
              />

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading
            ? "Sending reset link..."
            : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  );
}
