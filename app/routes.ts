import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  route("login", "pages/login.tsx"),
  route("register", "pages/register.tsx"),
  route("forgot-password", "pages/forgot-password.tsx"),
  route("reset-password", "pages/reset-password.tsx"),
  route("verify-email", "pages/verify-email.tsx"),
  
] satisfies RouteConfig;