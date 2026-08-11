import { Link, useLocation } from "react-router";
import { FileText, LayoutDashboard, Package, Repeat, Settings, Users, ReceiptText } from "lucide-react";
import { cn } from "~/lib/utils";

export const NAV_ITEMS = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Invoices",
    url: "/invoices",
    icon: FileText,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
  },
  {
    title: "Products & Services",
    url: "/products",
    icon: Package,
  },
  {
    title: "Recurring Invoices",
    url: "/recurring-invoices",
    icon: Repeat,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
] as const;

export function BrandMark({
  className,
}: {
  className?: string;
}) {
  return (
    <Link
      to="/"
      className={cn(
        "flex items-center gap-2",
        className,
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <ReceiptText
          className="size-5"
          aria-hidden
        />
      </span>

      <span className="text-lg font-bold tracking-tight text-foreground">
        Fakturia
      </span>
    </Link>
  );
}

export function SidebarNav({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const location = useLocation();

  const pathname = location.pathname;

  return (
    <nav
      aria-label="Main navigation"
      className="flex flex-col gap-1 p-3"
    >
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.url ||
          pathname.startsWith(`${item.url}/`);

        return (
          <Link
            key={item.url}
            to={item.url}
            onClick={onNavigate}
            aria-current={
              active ? "page" : undefined
            }
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <item.icon
              className="size-4 shrink-0"
              aria-hidden
            />

            <span className="truncate">
              {item.title}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}