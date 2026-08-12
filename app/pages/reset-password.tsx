import { Link, useNavigate, useSearchParams } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AuthShell } from "~/components/auth/auth-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { resetPasswordSchema } from "~/lib/validation";
import { useAuthStore } from "~/store/auth-store";

export function meta() {
  return [
    { title: "Choose a new password — Fakturia" },
    {
      name: "description",
      content: "Set a new password for your Fakturia account.",
    },
    {
      property: "og:title",
      content: "Choose a new password — Fakturia",
    },
    {
      property: "og:description",
      content: "Set a new password for your account.",
    },
  ];
}

type Values = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const resetPassword = useAuthStore(
    (state) => state.resetPassword
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading
  );

  const form = useForm<Values>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: Values) => {
    if (!token) {
      toast.error("Reset token is missing");
      return;
    }

    try {
      const response =
        await resetPassword({
        token,
        password: values.password,
        confirmPassword:
          values.confirmPassword,
      });

      toast.success(response.message);

      navigate("/login");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Failed to update password";

      toast.error(message);
    }
  };

  return (
    <AuthShell
      title="Choose a new password"
      description="Your new password must meet the security requirements."
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
        className="space-y-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password">
                New password{" "}
                <span className="text-destructive">*</span>
              </FieldLabel>

              <Input
                {...field}
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="confirmPassword">
                Confirm password{" "}
                <span className="text-destructive">*</span>
              </FieldLabel>

              <Input
                {...field}
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
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
          disabled={isLoading || !token}
        >
          {isLoading
            ? "Updating password..."
            : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}
