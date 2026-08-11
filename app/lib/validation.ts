import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address");

export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(/^[+()\d\s-]{7,20}$/, "Enter a valid phone number");

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
      .min( 8, "Password must be at least 8 characters" ),

    confirmPassword: z
      .string()
      .min( 1, "Please confirm your password" ),
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

export const passwordChecks = ( password: string ) => [
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

export const passwordStrength = ( password: string ) => {
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

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters"),

    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

  export const clientSchema = z.object({
  name: z.string().trim().min(2, "Client name is required").max(80),
  company: z.string().trim().max(80).optional().or(z.literal("")),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().trim().min(1, "Address is required").max(160),
  city: z.string().trim().min(1, "City is required").max(60),
  state: z.string().trim().max(60).optional().or(z.literal("")),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, "Enter a valid postal code"),
  country: z.string().trim().min(1, "Country is required").max(60),
  paymentTerms: z.enum(["due_on_receipt", "net_7", "net_15", "net_30", "net_60"]),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type ClientValues = z.infer<typeof clientSchema>;

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  type: z.enum(["product", "service"]),
  description: z.string().max(300).optional().or(z.literal("")),
  price: z.coerce.number().positive("Price must be greater than 0"),
  unit: z.string().trim().min(1, "Unit is required").max(20),
  tax: z.coerce.number().min(0, "Tax cannot be negative").max(100, "Tax cannot exceed 100%"),
  categoryId: z.string().min(1, "Category is required"),
  status: z.enum(["active", "inactive"]),
});
export type ProductValues = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(60),
  description: z.string().max(200).optional().or(z.literal("")),
  status: z.enum(["active", "archived"]),
});
export type CategoryValues = z.infer<typeof categorySchema>;

export const invoiceItemSchema = z.object({
  id: z.string(),
  productId: z.string().nullable(),
  name: z.string().trim().min(1, "Item name is required"),
  description: z.string().max(200).optional().or(z.literal("")),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative"),
  discount: z.coerce.number().min(0, "Min 0%").max(100, "Max 100%"),
  tax: z.coerce.number().min(0, "Min 0%").max(100, "Max 100%"),
});

export const invoiceSchema = z
  .object({
    number: z.string().trim().min(3, "Invoice number is required"),
    clientId: z.string().min(1, "Select a client"),
    issueDate: z.string().min(1, "Issue date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    paymentTerms: z.enum(["due_on_receipt", "net_7", "net_15", "net_30", "net_60"]),
    currency: z.string().min(1, "Currency is required"),
    notes: z.string().max(500).optional().or(z.literal("")),
    terms: z.string().max(500).optional().or(z.literal("")),
    items: z.array(invoiceItemSchema).min(1, "Add at least one invoice item"),
  })
  .refine((v) => new Date(v.dueDate) >= new Date(v.issueDate), {
    path: ["dueDate"],
    message: "Due date cannot be before the issue date",
  });
export type InvoiceValues = z.infer<typeof invoiceSchema>;

export const recurringSchema = z
  .object({
    clientId: z.string().min(1, "Select a client"),
    frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional().or(z.literal("")),
    paymentTerms: z.enum(["due_on_receipt", "net_7", "net_15", "net_30", "net_60"]),
    items: z.array(invoiceItemSchema).min(1, "Add at least one invoice item"),
  })
  .refine((v) => !v.endDate || new Date(v.endDate) >= new Date(v.startDate), {
    path: ["endDate"],
    message: "End date cannot be before the start date",
  });
export type RecurringValues = z.infer<typeof recurringSchema>;

export const sendInvoiceSchema = z.object({
  to: emailSchema,
  cc: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || v.split(",").every((e) => /^\S+@\S+\.\S+$/.test(e.trim())), {
      message: "Enter valid email addresses separated by commas",
    }),
  subject: z.string().trim().min(1, "Subject is required").max(120),
  message: z.string().trim().min(1, "Message is required").max(1000),
});
export type SendInvoiceValues = z.infer<typeof sendInvoiceSchema>;

export const businessProfileSchema = z.object({
  name: z.string().trim().min(2, "Business name is required").max(80),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().trim().min(1, "Address is required").max(160),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  taxId: z.string().trim().max(40).optional().or(z.literal("")),
});

export const invoiceSettingsSchema = z.object({
  currency: z.string().min(1, "Currency is required"),
  defaultPaymentTerms: z.enum(["due_on_receipt", "net_7", "net_15", "net_30", "net_60"]),
  defaultNotes: z.string().max(500).optional().or(z.literal("")),
  defaultTerms: z.string().max(500).optional().or(z.literal("")),
  numberPrefix: z
    .string()
    .trim()
    .min(1, "Prefix is required")
    .max(10)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes only"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: emailSchema,
});