import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Bell, LogOut, Menu, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Sheet,  SheetContent, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "~/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { BrandMark, SidebarNav } from "./sidebar-nav";
import { useAppStore } from "~/store/app-store";
import { formatDate, initials } from "~/lib/format";
import { cn } from "~/lib/utils";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  invoices: "Invoices",
  clients: "Clients",
  products: "Products & Services",
  "recurring-invoices": "Recurring Invoices",
  settings: "Settings",
  new: "New Invoice",
};

function useCrumbs() {
  const location = useLocation();

  const segments = location.pathname
    .split("/")
    .filter(Boolean);

  return segments.map((segment, index) => ({
    label:
      LABELS[segment] ??
      decodeURIComponent(segment),

    href: `/${segments
      .slice(0, index + 1)
      .join("/")}`,

    last:
      index === segments.length - 1,
  }));
}

export function DashboardHeader() {
  const crumbs = useCrumbs();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const {
    notifications,
    markAllNotificationsRead,
    user,
    logout,
  } = useAppStore();

  const navigate = useNavigate();

  const unread = notifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Sheet
            open={mobileOpen}
            onOpenChange={setMobileOpen}
          >
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-72 p-0"
            >
              <SheetTitle className="sr-only">
                Navigation
              </SheetTitle>

              <div className="border-b border-border p-4">
                <BrandMark />
              </div>

              <SidebarNav
                onNavigate={() =>
                  setMobileOpen(false)
                }
              />
            </SheetContent>
          </Sheet>

          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink asChild>
                  <Link to="/dashboard">
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              {crumbs.map((crumb) => (
                <span
                  key={crumb.href}
                  className="contents"
                >
                  <BreadcrumbSeparator className="hidden sm:block" />

                  <BreadcrumbItem className="min-w-0">
                    {crumb.last ? (
                      <BreadcrumbPage className="truncate">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.href}>
                          {crumb.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            asChild
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link to="/invoices/new">
              <Plus
                className="size-4"
                aria-hidden
              />
              New Invoice
            </Link>
          </Button>

          {/* Notifications */}
          <DropdownMenu
            onOpenChange={(open) => {
              if (open && unread > 0) {
                markAllNotificationsRead();
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative"
                aria-label={`Notifications${
                  unread
                    ? `, ${unread} unread`
                    : ""
                }`}
              >
                <Bell className="size-4" />

                {unread > 0 ? (
                  <Badge className="absolute -right-1.5 -top-1.5 size-5 justify-center rounded-full p-0 text-[10px]">
                    {unread}
                  </Badge>
                ) : null}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-80 p-0"
            >
              <DropdownMenuLabel className="px-4 py-3">
                Notifications
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="m-0" />

              <ScrollArea className="max-h-80">
                {notifications.map(
                  (notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "border-b border-border px-4 py-3 last:border-0",
                        !notification.read &&
                          "bg-accent/40",
                      )}
                    >
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {notification.description}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(
                          notification.date,
                        )}
                      </p>
                    </div>
                  ),
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-2 px-2"
                aria-label="Account menu"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>

                <span className="hidden text-sm font-medium md:inline">
                  {user.name}
                </span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56"
            >
              <DropdownMenuLabel>
                <p className="text-sm font-medium">
                  {user.name}
                </p>

                <p className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </p>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <User
                    className="size-4"
                    aria-hidden
                  />
                  Profile & settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  logout();

                  toast.success(
                    "You have been signed out",
                  );

                  navigate("/login");
                }}
              >
                <LogOut
                  className="size-4"
                  aria-hidden
                />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}