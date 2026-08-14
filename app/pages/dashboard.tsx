import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Line, LineChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Clock, Wallet, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { PageHeader } from "~/components/common/page-parts";
import { InvoiceStatusBadge } from "~/components/common/status-badges";
import { invoiceTotals } from "~/data/types";
import { formatDate, formatIDR, daysUntil } from "~/lib/format";
import { axiosInstance } from "~/lib/axios";
import { toast } from "sonner";

export function meta() {
  return [
    { title: "Dashboard — Fakturia" },
    {
      name: "description",
      content: "Revenue, outstanding balances and invoice activity at a glance.",
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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const res = await axiosInstance.get("/invoice?limit=10000");
        
        const mappedInvoices = res.data.data.map((inv: any) => ({
          ...inv,
          status: inv.status?.toLowerCase() || "draft",
          payment: inv.paymentDate ? {
            date: inv.paymentDate,
            method: inv.paymentMethod,
            amount: Number(inv.amountPaid || 0),
            reference: inv.paymentReference
          } : null,
          items: (inv.items || []).map((item: any) => ({
            ...item,
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            discount: Number(item.discount || 0),
            tax: Number(item.tax || 0),
          })),
        }));

        setInvoices(mappedInvoices);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to fetch dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

    return { revenue, outstanding, paid, overdue };
  }, [invoices]);

  const revenueSeries = useMemo(() => {
    const buckets = new Map<string, number>();

    for (const inv of invoices) {
      if (inv.status !== "paid") {
        continue;
      }
      const dateString = inv.payment?.date || inv.issueDate;
      const key = inv.payment.date.slice(0, 7);
      buckets.set(key, (buckets.get(key) ?? 0) + invoiceTotals(inv.items).total);
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({
        month: new Date(`${month}-01`).toLocaleDateString("en-GB", {
          month: "short",
          year: "2-digit",
        }),
        value,
      }));
  }, [invoices]);

  const statusSeries = useMemo(
    () =>
      ["paid", "pending", "overdue", "draft"].map((status) => ({
        name: `${status.charAt(0).toUpperCase()}${status.slice(1)}`,
        key: status,
        value: invoices.filter((invoice) => invoice.status === status).length,
      })),
    [invoices],
  );

  const recent = useMemo(
    () =>
      [...invoices]
        .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
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
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5),
    [invoices],
  );

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Loader2 className="size-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An overview of your invoicing activity."
        actions={
          <Button asChild>
            <Link to="/invoices/new">New Invoice</Link>
          </Button>
        }
      />

      <Card className="mb-4 shadow-sm">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold tracking-tight">{formatIDR(stats.revenue)}</h2>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4" />
                <span className="text-sm font-medium">Outstanding</span>
              </div>
              <h3 className="text-2xl font-bold">{formatIDR(stats.outstanding)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="size-4 text-success" />
                <span className="text-sm font-medium">Paid</span>
              </div>
              <h3 className="text-2xl font-bold">{formatIDR(stats.paid)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="size-4 text-destructive" />
                <span className="text-sm font-medium">Overdue</span>
              </div>
              <h3 className="text-2xl font-bold">{formatIDR(stats.overdue)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Revenue over time</CardTitle>
          </CardHeader>
          <CardContent className="h-72 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueSeries} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tickFormatter={(value: number) => `${Math.round(value / 1_000_000)}jt`}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                  width={44}
                />
                <RTooltip
                  formatter={(value) => (typeof value === "number" ? formatIDR(value) : "-")}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--primary)" 
                  strokeWidth={2} 
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Invoice status</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex felx-col p-6 pt-0">
            <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusSeries}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {statusSeries.map((entry) => (
                    <Cell 
                      key={entry.key} 
                      fill={STATUS_COLORS[entry.key]} 
                      /* Logika redup jika elemen lain di hover */
                      opacity={hoveredStatus === null || hoveredStatus === entry.key ? 1 : 0.3}
                      style={{ transition: 'opacity 0.3s ease' }}
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
            </div>
            
            <ul className="mt-2 grid grid-cols-2 gap-2 text-sm shrink-0">
              {statusSeries.map((status) => (
                <li 
                  key={status.key} 
                  className="flex cursor-pointer items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted/50 text-muted-foreground"
                  onMouseEnter={() => setHoveredStatus(status.key)}
                  onMouseLeave={() => setHoveredStatus(null)}
                >
                  <span
                    className="size-3 rounded-full"
                    style={{ background: STATUS_COLORS[status.key] }}
                  />
                  <span className={hoveredStatus === status.key ? "font-medium text-foreground" : ""}>
                    {status.name} ({status.value})
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent invoices</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/invoices">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link to={`/invoices/${invoice.id}`} className="hover:underline text-primary">
                          {invoice.number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {invoice.client?.company || invoice.client?.name || "Unknown client"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatIDR(invoiceTotals(invoice.items).total)}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status} />
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
            <CardTitle className="text-base">Upcoming payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments due in the next 45 days.</p>
            ) : (
              upcoming.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/invoices/${invoice.id}`}
                      className="block truncate text-sm font-medium hover:underline text-primary"
                    >
                      {invoice.number}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {invoice.client?.company || invoice.client?.name || "Unknown client"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">
                      {formatIDR(invoiceTotals(invoice.items).total)}
                    </p>
                    <p className="text-xs text-muted-foreground">in {daysUntil(invoice.dueDate)} days</p>
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