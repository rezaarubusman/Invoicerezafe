import { useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "~/components/auth/auth-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Progress } from "~/components/ui/progress";
import { Field, FieldContent, FieldError, FieldLabel } from "~/components/ui/field";
import { registerSchema, type RegisterValues, passwordChecks, passwordStrength } from "~/lib/validation";
import { useAuthStore } from "~/store/auth-store";

export default function RegisterPage() {
  const navigate = useNavigate();

  const register = useAuthStore(
    (state) => state.register
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading
  );

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),

    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },

    mode: "onChange",
  });

  const password = form.watch("password");

  const strength =
    passwordStrength(password);

  const checks =
    passwordChecks(password);

  const onSubmit = async (
    values: RegisterValues
  ) => {
    try {
      const response =
        await register(values);

      toast.success(response.message);

      navigate({
        to: "/verify-email",
        search: {
          email: values.email,
        },
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Registration failed";

      toast.error(message);
    }
  };

  return (
    <AuthShell>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Name */}
        <Field
          data-invalid={
            !!form.formState.errors.name
          }
        >
          <FieldLabel htmlFor="name">
            Full name
          </FieldLabel>

          <FieldContent>
            <Input
              id="name"
              placeholder="Rani Kusuma"
              autoComplete="name"
              {...form.register("name")}
            />

            <FieldError
              errors={[
                form.formState.errors.name,
              ]}
            />
          </FieldContent>
        </Field>

        {/* Email */}
        <Field
          data-invalid={
            !!form.formState.errors.email
          }
        >
          <FieldLabel htmlFor="email">
            Email
          </FieldLabel>

          <FieldContent>
            <Input
              id="email"
              type="email"
              placeholder="you@company.id"
              autoComplete="email"
              {...form.register("email")}
            />

            <FieldError
              errors={[
                form.formState.errors.email,
              ]}
            />
          </FieldContent>
        </Field>

        {/* Password */}
        <Field
          data-invalid={
            !!form.formState.errors.password
          }
        >
          <FieldLabel htmlFor="password">
            Password
          </FieldLabel>

          <FieldContent>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
            />

            {password && (
              <>
                <Progress
                  value={
                    (strength.score / 5) *
                    100
                  }
                  className="h-1.5"
                />

                <p className="text-xs text-muted-foreground">
                  {strength.label}
                </p>

                <ul className="space-y-1">
                  {checks.map((check) => (
                    <li
                      key={check.label}
                      className={
                        check.ok
                          ? "flex items-center gap-2 text-xs text-success"
                          : "flex items-center gap-2 text-xs text-muted-foreground"
                      }
                    >
                      {check.ok ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}

                      {check.label}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <FieldError
              errors={[
                form.formState.errors.password,
              ]}
            />
          </FieldContent>
        </Field>

        {/* Confirm Password */}
        <Field
          data-invalid={
            !!form.formState.errors.confirmPassword
          }
        >
          <FieldLabel htmlFor="confirmPassword">
            Confirm password
          </FieldLabel>

          <FieldContent>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...form.register(
                "confirmPassword"
              )}
            />

            <FieldError
              errors={[
                form.formState.errors
                  .confirmPassword,
              ]}
            />
          </FieldContent>
        </Field>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading
            ? "Creating account..."
            : "Create account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}