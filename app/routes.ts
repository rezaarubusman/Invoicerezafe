import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  route("login", "pages/login.tsx"),
  route("register", "pages/register.tsx"),
  route("forgot-password", "pages/forgot-password.tsx"),
  route("reset-password", "pages/reset-password.tsx"),
  route("verify-email", "pages/verify-email.tsx"),

  layout("layout/dashboard-layout-main.tsx", [
    route("dashboard", "pages/dashboard.tsx"),
    //route("invoices", "pages/invoices.tsx"),
    //route("clients", "pages/clients.tsx"),
    //route("products", "pages/products.tsx"),
    //route("recurring-invoices", "pages/recurring-invoices.tsx"),
    //route("settings", "pages/settings.tsx"),
  ]),

] satisfies RouteConfig;