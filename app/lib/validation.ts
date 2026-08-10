import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),

  password: z
    .string()
    .min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required"),

    email: z
      .string()
      .trim()
      .email("Please enter a valid email address"),

    password: z
      .string()
      .min(
        8,
        "Password must be at least 8 characters"
      ),

    confirmPassword: z
      .string()
      .min(
        1,
        "Please confirm your password"
      ),
  })
  .refine(
    (data) =>
      data.password === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

export type LoginValues =
  z.infer<typeof loginSchema>;

export type RegisterValues =
  z.infer<typeof registerSchema>;


/* -------------------------------- */
/* Password checks */
/* -------------------------------- */

export const passwordChecks = (
  password: string
) => [
  {
    label: "At least 8 characters",
    ok: password.length >= 8,
  },
  {
    label: "Contains uppercase letter",
    ok: /[A-Z]/.test(password),
  },
  {
    label: "Contains lowercase letter",
    ok: /[a-z]/.test(password),
  },
  {
    label: "Contains number",
    ok: /\d/.test(password),
  },
  {
    label: "Contains special character",
    ok: /[^A-Za-z0-9]/.test(password),
  },
];


/* -------------------------------- */
/* Password strength */
/* -------------------------------- */

export const passwordStrength = (
  password: string
) => {
  const checks =
    passwordChecks(password);

  const score = checks.filter(
    (check) => check.ok
  ).length;

  const labels = [
    "",
    "Very weak",
    "Weak",
    "Fair",
    "Strong",
    "Very strong",
  ];

  return {
    score,
    label: labels[score],
  };
};