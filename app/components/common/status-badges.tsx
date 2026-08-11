import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { InvoiceStatus, RecurringStatus } from "~/data/types";

const invoiceStyles: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  pending: "bg-warning-soft text-warning border-transparent",
  paid: "bg-success-soft text-success border-transparent",
  overdue: "bg-destructive/10 text-destructive border-transparent",
  cancelled: "bg-secondary text-muted-foreground border-border line-through",
};

const invoiceLabels: Record<InvoiceStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", invoiceStyles[status], className)}>
      {invoiceLabels[status]}
    </Badge>
  );
}

const recurringStyles: Record<RecurringStatus, string> = {
  active: "bg-success-soft text-success border-transparent",
  paused: "bg-warning-soft text-warning border-transparent",
  completed: "bg-secondary text-secondary-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-transparent",
};

export function RecurringStatusBadge({ status }: { status: RecurringStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", recurringStyles[status])}>
      {status}
    </Badge>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: "active" | "inactive" | "archived";
  className?: string;
}) {
  const styles = {
    active: "bg-success-soft text-success border-transparent",
    inactive: "bg-warning-soft text-warning border-transparent",
    archived: "bg-secondary text-muted-foreground border-border",
  } as const;
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", styles[status], className)}>
      {status}
    </Badge>
  );
}