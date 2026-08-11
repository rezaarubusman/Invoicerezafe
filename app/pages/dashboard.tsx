import { useMemo } from "react";
import { Link } from "react-router";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Clock, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { PageHeader, StatCard } from "~/components/common/page-parts";
import { InvoiceStatusBadge } from "~/components/common/status-badges";
import { useAppStore } from "~/store/app-store";
import { invoiceTotals } from "~/data/types";
import { formatDate, formatIDR, daysUntil } from "~/lib/format";

export function meta() {
  return [
    { title: "Dashboard — Fakturia" },
    {
      name: "description",
      content:
        "Revenue, outstanding balances and invoice activity at a glance.",
    },
    {
      property: "og:title",
      content: "Dashboard — Fakturia",
    },
    {
      property: "og:description",
      content:
        "Track revenue, outstanding and overdue invoices.",
    },
  ];
}

const STATUS_COLORS: Record<string, string> = {
  paid: "var(--success)",
  pending: "var(--warning)",
  overdue: "var(--destructive)",
  draft: "var(--muted-foreground)",
};

export default function DashboardPage() {
  const { invoices, clients } = useAppStore();

  const stats = useMemo(() => {
    let revenue = 0;
    let outstanding = 0;
    let paid = 0;
    let overdue = 0;

    for (const inv of invoices) {
      const total = invoiceTotals(inv.items).total;

      if (inv.status === "paid") {
        revenue += total;
        paid += total;
      }

      if (inv.status === "pending") {
        outstanding += total;
      }

      if (inv.status === "overdue") {
        outstanding += total;
        overdue += total;
      }
    }

    return {
      revenue,
      outstanding,
      paid,
      overdue,
    };
  }, [invoices]);

  const revenueSeries = useMemo(() => {
    const buckets = new Map<string, number>();

    for (const inv of invoices) {
      if (inv.status !== "paid" || !inv.payment) {
        continue;
      }

      const key = inv.payment.date.slice(0, 7);

      buckets.set(
        key,
        (buckets.get(key) ?? 0) +
          invoiceTotals(inv.items).total,
      );
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({
        month: new Date(
          `${month}-01`,
        ).toLocaleDateString("en-GB", {
          month: "short",
          year: "2-digit",
        }),
        value,
      }));
  }, [invoices]);

  const statusSeries = useMemo(
    () =>
      ["paid", "pending", "overdue", "draft"].map(
        (status) => ({
          name:
            `${status.charAt(0).toUpperCase()}${status.slice(1)}`,
          key: status,
          value: invoices.filter(
            (invoice) => invoice.status === status,
          ).length,
        }),
      ),
    [invoices],
  );

  const recent = useMemo(
    () =>
      [...invoices]
        .sort((a, b) =>
          b.issueDate.localeCompare(a.issueDate),
        )
        .slice(0, 6),
    [invoices],
  );

  const upcoming = useMemo(
    () =>
      invoices
        .filter(
          (invoice) =>
            invoice.status === "pending" &&
            daysUntil(invoice.dueDate) >= 0 &&
            daysUntil(invoice.dueDate) <= 45,
        )
        .sort((a, b) =>
          a.dueDate.localeCompare(b.dueDate),
        )
        .slice(0, 5),
    [invoices],
  );

  const clientName = (id: string) => {
    const client = clients.find(
      (client) => client.id === id,
    );

    return client
      ? client.company || client.name
      : "Unknown client";
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An overview of your invoicing activity."
        actions={
          <Button asChild>
            <Link to="/invoices/new">
              New Invoice
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatIDR(stats.revenue)}
          icon={Wallet}
          hint="All settled invoices"
        />

        <StatCard
          label="Outstanding"
          value={formatIDR(stats.outstanding)}
          icon={Clock}
          tone="warning"
          hint="Pending + overdue"
        />

        <StatCard
          label="Paid"
          value={formatIDR(stats.paid)}
          icon={CheckCircle2}
          tone="success"
          hint="Received payments"
        />

        <StatCard
          label="Overdue"
          value={formatIDR(stats.overdue)}
          icon={AlertTriangle}
          tone="destructive"
          hint="Past the due date"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Revenue over time
            </CardTitle>
          </CardHeader>

          <CardContent className="h-72 pr-2">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={revenueSeries}
                margin={{
                  left: 8,
                  right: 8,
                }}
              >
                <defs>
                  <linearGradient
                    id="rev"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity={0.35}
                    />

                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                />

                <YAxis
                  tickFormatter={(value: number) =>
                    `${Math.round(value / 1_000_000)}jt`
                  }
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                  width={44}
                />

                <RTooltip
                    formatter={(value) =>
                    typeof value === "number"
                    ? formatIDR(value)
                    : "-"
                    }
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              Invoice status
            </CardTitle>
          </CardHeader>

          <CardContent className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={statusSeries}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {statusSeries.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={STATUS_COLORS[entry.key]}
                    />
                  ))}
                </Pie>

                <RTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {statusSeries.map((status) => (
                <li
                  key={status.key}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{
                      background:
                        STATUS_COLORS[status.key],
                    }}
                  />

                  {status.name} ({status.value})
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">
              Recent invoices
            </CardTitle>

            <Button
              asChild
              variant="ghost"
              size="sm"
            >
              <Link to="/invoices">
                View all
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>

                    <TableHead className="hidden md:table-cell">
                      Issued
                    </TableHead>

                    <TableHead className="hidden md:table-cell">
                      Due
                    </TableHead>

                    <TableHead className="text-right">
                      Amount
                    </TableHead>

                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {recent.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="hover:underline"
                        >
                          {invoice.number}
                        </Link>
                      </TableCell>

                      <TableCell className="max-w-40 truncate">
                        {clientName(invoice.clientId)}
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        {formatDate(invoice.issueDate)}
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        {formatDate(invoice.dueDate)}
                      </TableCell>

                      <TableCell className="text-right font-medium">
                        {formatIDR(
                          invoiceTotals(invoice.items).total,
                        )}
                      </TableCell>

                      <TableCell>
                        <InvoiceStatusBadge
                          status={invoice.status}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              Upcoming payments
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payments due in the next 45 days.
              </p>
            ) : (
              upcoming.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/invoices/${invoice.id}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {invoice.number}
                    </Link>

                    <p className="truncate text-xs text-muted-foreground">
                      {clientName(invoice.clientId)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">
                      {formatIDR(
                        invoiceTotals(invoice.items).total,
                      )}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      in {daysUntil(invoice.dueDate)} days
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}