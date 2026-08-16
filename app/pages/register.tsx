import { useState } from "react";
import { Link, useNavigate } from "react-router";
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
import { axiosInstance } from "~/lib/axios";

export function meta() {
  return [
    { title: "Create account — Fakturia" },
    { name: "description", content: "Create your Fakturia account." },
  ];
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

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

  const password = form.watch("password") || "";
  const strength = passwordStrength(password);
  const checks = passwordChecks(password);

  const onSubmit = async (values: RegisterValues) => {
    try {
      setIsLoading(true);

      const { confirmPassword, ...payload } = values;

      const response = await axiosInstance.post("/auth/register", payload);

      toast.success(response.data.message);
      navigate(`/verify-email?email=${encodeURIComponent(payload.email)}`);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Registration failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      description="Start managing your clients and invoices with Fakturia."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Field data-invalid={!!form.formState.errors.name}>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <FieldContent>
            <Input
              id="name"
              placeholder="Rani Kusuma"
              autoComplete="name"
              {...form.register("name")}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </FieldContent>
        </Field>

        <Field data-invalid={!!form.formState.errors.email}>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <FieldContent>
            <Input
              id="email"
              type="email"
              placeholder="you@company.id"
              autoComplete="email"
              {...form.register("email")}
            />
            <FieldError errors={[form.formState.errors.email]} />
          </FieldContent>
        </Field>

        <Field data-invalid={!!form.formState.errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <FieldContent>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
            />

            {password && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Password strength
                  </span>
                  <span className="text-xs font-medium">
                    {strength.label}
                  </span>
                </div>

                <Progress
                  value={(strength.score / 5) * 100}
                  className="h-1.5"
                />

                <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                  {checks.map((check) => (
                    <li
                      key={check.label}
                      className={`flex items-center gap-1.5 text-xs ${
                        check.ok
                          ? "text-success"
                          : "text-muted-foreground"
                      }`}
                    >
                      {check.ok ? (
                        <Check className="size-3 shrink-0" />
                      ) : (
                        <X className="size-3 shrink-0" />
                      )}
                      {check.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <FieldError errors={[form.formState.errors.password]} />
          </FieldContent>
        </Field>

        <Field data-invalid={!!form.formState.errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">
            Confirm password
          </FieldLabel>
          <FieldContent>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
            />
            <FieldError
              errors={[form.formState.errors.confirmPassword]}
            />
          </FieldContent>
        </Field>

        <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}