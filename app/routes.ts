import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  layout("layout/public-layout.tsx"),
    route("login", "pages/login.tsx"),
    route("register", "pages/register.tsx"),
    route("forgot-password", "pages/forgot-password.tsx"),
    route("reset-password", "pages/reset-password.tsx"),
    route("verify-email", "pages/verify-email.tsx"),

  layout("layout/dashboard-layout-main.tsx", [
    route("dashboard", "pages/dashboard.tsx"),
    route("invoices", "pages/invoice.tsx"),
    route("invoices/new", "pages/newinvoice.tsx"),
    route("invoices/:invoiceId", "pages/invoiceid.tsx"),
    route("recurring-invoices", "pages/recurring-invoice.tsx"),
    route("clients", "pages/client.tsx"),
    route("clients/:clientId", "pages/clientid.tsx"),
    route("products", "pages/product.tsx"),
    route("settings", "pages/setting.tsx"),
    route("*", "pages/dashboard-not-found.tsx"),
  ]),

] satisfies RouteConfig;