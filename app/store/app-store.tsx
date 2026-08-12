import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppNotification,
  BusinessProfile,
  Category,
  Client,
  Invoice,
  InvoiceSettings,
  InvoiceStatus,
  Payment,
  Product,
  RecurringInvoice,
  RecurringStatus,
  UserProfile,
} from "~/data/types";
import { useAuthStore } from "~/store/auth-store";

const emptyUser: UserProfile = {
  name: "",
  email: "",
  emailVerified: false,
};

const emptyBusiness: BusinessProfile = {
  name: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  taxId: "",
  logoDataUrl: null,
};

const defaultInvoiceSettings: InvoiceSettings = {
  currency: "IDR",
  defaultPaymentTerms: "due_on_receipt",
  defaultNotes: "",
  defaultTerms: "",
  numberPrefix: "INV",
};

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

interface AppStore {
  authenticated: boolean;
  login: () => void;
  logout: () => void;

  user: UserProfile;
  updateUser: (patch: Partial<UserProfile>) => void;

  business: BusinessProfile;
  updateBusiness: (patch: Partial<BusinessProfile>) => void;

  invoiceSettings: InvoiceSettings;
  updateInvoiceSettings: (patch: Partial<InvoiceSettings>) => void;

  clients: Client[];
  addClient: (data: Omit<Client, "id" | "createdAt">) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClient: (id: string) => Client | undefined;

  categories: Category[];
  addCategory: (data: Omit<Category, "id">) => Category;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  archiveCategory: (id: string) => void;

  products: Product[];
  addProduct: (data: Omit<Product, "id">) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  archiveProduct: (id: string) => void;

  invoices: Invoice[];
  addInvoice: (data: Omit<Invoice, "id">) => Invoice;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  setInvoiceStatus: (id: string, status: InvoiceStatus, payment?: Payment | null) => void;
  duplicateInvoice: (id: string) => Invoice | undefined;
  logActivity: (id: string, label: string, description: string) => void;
  nextInvoiceNumber: () => string;

  recurring: RecurringInvoice[];
  addRecurring: (data: Omit<RecurringInvoice, "id">) => RecurringInvoice;
  updateRecurring: (id: string, patch: Partial<RecurringInvoice>) => void;
  setRecurringStatus: (id: string, status: RecurringStatus) => void;
  deleteRecurring: (id: string) => void;

  notifications: AppNotification[];
  markAllNotificationsRead: () => void;
}

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const authUser = useAuthStore(
    (state) => state.user
  );

  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile>(emptyUser);
  const [business, setBusiness] = useState<BusinessProfile>(emptyBusiness);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(defaultInvoiceSettings);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [recurring, setRecurring] = useState<RecurringInvoice[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!authUser) {
      setUser(emptyUser);
      return;
    }

    setUser({
      name: authUser.name,
      email: authUser.email,
      emailVerified:
        authUser.isEmailVerified,
    });
  }, [authUser]);

  const getClient = useCallback((id: string) => clients.find((c) => c.id === id), [clients]);

  const nextInvoiceNumber = useCallback(() => {
    const year = new Date().getFullYear();
    const highest = invoices.reduce((max, inv) => {
      const match = /(\d+)$/.exec(inv.number);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return `${invoiceSettings.numberPrefix}-${year}-${String(highest + 1).padStart(4, "0")}`;
  }, [invoices, invoiceSettings.numberPrefix]);

  const value = useMemo<AppStore>(
    () => ({
      authenticated,
      login: () => setAuthenticated(true),
      logout: () => setAuthenticated(false),

      user,
      updateUser: (patch) => setUser((prev) => ({ ...prev, ...patch })),

      business,
      updateBusiness: (patch) => setBusiness((prev) => ({ ...prev, ...patch })),

      invoiceSettings,
      updateInvoiceSettings: (patch) => setInvoiceSettings((prev) => ({ ...prev, ...patch })),

      clients,
      addClient: (data) => {
        const client: Client = {
          ...data,
          id: nextId("cli"),
          createdAt: new Date().toISOString().slice(0, 10),
        };
        setClients((prev) => [client, ...prev]);
        return client;
      },
      updateClient: (id, patch) =>
        setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
      deleteClient: (id) => setClients((prev) => prev.filter((c) => c.id !== id)),
      getClient,

      categories,
      addCategory: (data) => {
        const category: Category = { ...data, id: nextId("cat") };
        setCategories((prev) => [category, ...prev]);
        return category;
      },
      updateCategory: (id, patch) =>
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
      archiveCategory: (id) =>
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "archived" as const } : c)),
        ),

      products,
      addProduct: (data) => {
        const product: Product = { ...data, id: nextId("prd") };
        setProducts((prev) => [product, ...prev]);
        return product;
      },
      updateProduct: (id, patch) =>
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      archiveProduct: (id) =>
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "archived" as const } : p)),
        ),

      invoices,
      addInvoice: (data) => {
        const invoice: Invoice = { ...data, id: nextId("inv") };
        setInvoices((prev) => [invoice, ...prev]);
        return invoice;
      },
      updateInvoice: (id, patch) =>
        setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i))),
      setInvoiceStatus: (id, status, payment) =>
        setInvoices((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  status,
                  payment: payment !== undefined ? payment : i.payment,
                  activity: [
                    ...i.activity,
                    {
                      id: nextId("act"),
                      date: new Date().toISOString().slice(0, 10),
                      label: `Status changed to ${status}`,
                      description: "Updated from the invoice detail page",
                    },
                  ],
                }
              : i,
          ),
        ),
      duplicateInvoice: (id) => {
        const source = invoices.find((i) => i.id === id);
        if (!source) return undefined;
        const year = new Date().getFullYear();
        const highest = invoices.reduce((max, inv) => {
          const match = /(\d+)$/.exec(inv.number);
          return match ? Math.max(max, Number(match[1])) : max;
        }, 0);
        const copy: Invoice = {
          ...source,
          id: nextId("inv"),
          number: `${invoiceSettings.numberPrefix}-${year}-${String(highest + 1).padStart(4, "0")}`,
          status: "draft",
          payment: null,
          items: source.items.map((it) => ({ ...it, id: nextId("it") })),
          activity: [
            {
              id: nextId("act"),
              date: new Date().toISOString().slice(0, 10),
              label: "Invoice duplicated",
              description: `Copied from ${source.number}`,
            },
          ],
        };
        setInvoices((prev) => [copy, ...prev]);
        return copy;
      },
      logActivity: (id, label, description) =>
        setInvoices((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  activity: [
                    ...i.activity,
                    {
                      id: nextId("act"),
                      date: new Date().toISOString().slice(0, 10),
                      label,
                      description,
                    },
                  ],
                }
              : i,
          ),
        ),
      nextInvoiceNumber,

      recurring,
      addRecurring: (data) => {
        const rec: RecurringInvoice = { ...data, id: nextId("rec") };
        setRecurring((prev) => [rec, ...prev]);
        return rec;
      },
      updateRecurring: (id, patch) =>
        setRecurring((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))),
      setRecurringStatus: (id, status) =>
        setRecurring((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r))),
      deleteRecurring: (id) => setRecurring((prev) => prev.filter((r) => r.id !== id)),

      notifications,
      markAllNotificationsRead: () =>
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
    }),
    [
      authenticated,
      user,
      business,
      invoiceSettings,
      clients,
      categories,
      products,
      invoices,
      recurring,
      notifications,
      getClient,
      nextInvoiceNumber,
    ],
  );

  return (
  <AppStoreContext.Provider value={value}>
    {children}
  </AppStoreContext.Provider>
);
}

export function useAppStore(): AppStore {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}

export { nextId };
