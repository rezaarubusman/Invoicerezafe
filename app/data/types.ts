export type PaymentTerm = "due_on_receipt" | "net_7" | "net_15" | "net_30" | "net_60";

export const PAYMENT_TERMS: { value: PaymentTerm; label: string; days: number }[] = [
  { value: "due_on_receipt", label: "Due on receipt", days: 0 },
  { value: "net_7", label: "Net 7", days: 7 },
  { value: "net_15", label: "Net 15", days: 15 },
  { value: "net_30", label: "Net 30", days: 30 },
  { value: "net_60", label: "Net 60", days: 60 },
];

export function paymentTermLabel(term: PaymentTerm): string {
  return PAYMENT_TERMS.find((t) => t.value === term)?.label ?? term;
}

export function paymentTermDays(term: PaymentTerm): number {
  return PAYMENT_TERMS.find((t) => t.value === term)?.days ?? 0;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  paymentTerms: PaymentTerm;
  notes: string;
  createdAt: string;
}

export type ProductType = "product" | "service";

export interface Category {
  id: string;
  name: string;
  description: string;
  status: "active" | "archived";
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  description: string;
  price: number;
  unit: string;
  tax: number;
  categoryId: string;
  status: "active" | "inactive" | "archived";
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft",
  "pending",
  "paid",
  "overdue",
  "cancelled",
];

export type PaymentMethod = "bank_transfer" | "cash" | "credit_card" | "other";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

export interface InvoiceItem {
  id: string;
  productId: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percent
  tax: number; // percent
}

export interface Payment {
  date: string;
  method: PaymentMethod;
  amount: number;
  reference: string;
}

export interface ActivityEntry {
  id: string;
  date: string;
  label: string;
  description: string;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: PaymentTerm;
  currency: string;
  notes: string;
  terms: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  payment: Payment | null;
  activity: ActivityEntry[];
}

export type RecurringFrequency = "weekly" | "monthly" | "quarterly" | "yearly";
export type RecurringStatus = "active" | "paused" | "completed" | "cancelled";

export interface RecurringInvoice {
  id: string;
  clientId: string;
  items: InvoiceItem[];
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string | null;
  nextInvoiceDate: string;
  paymentTerms: PaymentTerm;
  status: RecurringStatus;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  date: string;
  read: boolean;
}

export interface BusinessProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  taxId: string;
  logoDataUrl: string | null;
}

export interface InvoiceSettings {
  currency: string;
  defaultPaymentTerms: PaymentTerm;
  defaultNotes: string;
  defaultTerms: string;
  numberPrefix: string;
}

export interface UserProfile {
  name: string;
  email: string;
  emailVerified: boolean;
}

export interface ItemTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export function lineTotals(item: InvoiceItem): ItemTotals {
  const gross = item.quantity * item.unitPrice;
  const discount = (gross * item.discount) / 100;
  const net = gross - discount;
  const tax = (net * item.tax) / 100;
  return { subtotal: gross, discount, tax, total: net + tax };
}

export function invoiceTotals(items: InvoiceItem[]): ItemTotals {
  return items.reduce<ItemTotals>(
    (acc, item) => {
      const t = lineTotals(item);
      return {
        subtotal: acc.subtotal + t.subtotal,
        discount: acc.discount + t.discount,
        tax: acc.tax + t.tax,
        total: acc.total + t.total,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  );
}
