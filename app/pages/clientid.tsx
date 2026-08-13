import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, FileText, Mail, MapPin, Phone, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { EmptyState, PageHeader, StatCard } from "~/components/common/page-parts";
import { InvoiceStatusBadge } from "~/components/common/status-badges";
import { invoiceTotals, paymentTermLabel, type Client, type Invoice } from "~/data/types";
import { formatDate, formatIDR } from "~/lib/format";
import { DEFAULT_INVOICE_SEARCH } from "~/lib/invoice-search";
import { axiosInstance } from "~/lib/axios";
import { toast } from "sonner";

export function meta() {
  return [
    { title: "Client details — Fakturia" },
    { name: "description", content: "Contact details, balances and invoice history for a client." },
  ];
}

type ClientWithInvoices = Client & {
  invoices: Invoice[];
};

export default function ClientDetailPage() {
  const { clientId } = useParams();

  const [client, setClient] = useState<ClientWithInvoices | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClientDetail = async () => {
      if (!clientId) return;
      
      try {
        setIsLoading(true);
        const res = await axiosInstance.get(`/client/${clientId}`);
        const data = res.data.data;

        const matchedInvoices = (data.invoices || []).map((inv: any) => ({
          ...inv,
          status: inv.status?.toLowerCase(), 
          items: (inv.items || []).map((item: any) => ({
            ...item,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
            tax: Number(item.tax),
          })),
        }));

        setClient({
          ...data,
          country: data.country || "Indonesia",
          paymentTerms: data.paymentTerms || "net_30",
          invoices: matchedInvoices,
        });

      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to load client details");
        setClient(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientDetail();
  }, [clientId]);

  const stats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let outstanding = 0;

    if (!client?.invoices) return { total, paid, outstanding };

    for (const invoice of client.invoices) {
      const amount = invoice.items ? invoiceTotals(invoice.items).total : 0;

      if (invoice.status === "cancelled") { continue }
      total += amount;

      if (invoice.status === "paid") { paid += amount }

      if (invoice.status === "pending" || invoice.status === "overdue") { outstanding += amount }
    }

    return { total, paid, outstanding };
  }, [client]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="size-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <EmptyState
            icon={FileText}
            title="Client not found"
            description="This client may have been removed from your workspace or doesn't exist."
            action={
              <Button asChild>
                <Link to="/clients">Back to clients</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const invoiceSearchParams = new URLSearchParams({
    search: DEFAULT_INVOICE_SEARCH.search,
    status: DEFAULT_INVOICE_SEARCH.status,
    from: DEFAULT_INVOICE_SEARCH.from,
    to: DEFAULT_INVOICE_SEARCH.to,
    sort: DEFAULT_INVOICE_SEARCH.sort,
    dir: DEFAULT_INVOICE_SEARCH.dir,
    page: String(DEFAULT_INVOICE_SEARCH.page),
    client: client.id,
  });

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/clients">
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Back to clients
        </Link>
      </Button>

      <PageHeader
        title={client.company || client.name}
        description={`${client.name} · ${paymentTermLabel(client.paymentTerms as any)}`}
        actions={
          <Button asChild>
            <Link to="/invoices/new">New invoice</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total invoiced" value={formatIDR(stats.total)} icon={FileText} />
        <StatCard label="Paid" value={formatIDR(stats.paid)} icon={FileText} tone="success" />
        <StatCard label="Outstanding" value={formatIDR(stats.outstanding)} icon={FileText} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Contact Information Card */}
        <Card className="shadow-sm lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Contact information</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <p className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a href={`mailto:${client.email}`} className="hover:underline">
                {client.email}
              </a>
            </p>

            {client.phone && (
              <p className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {client.phone}
              </p>
            )}

            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>
                {client.address || "No address provided"}
                <br />
                {client.city}
                {client.state ? `, ${client.state}` : ""} {client.postalCode}
                <br />
                {client.country}
              </span>
            </p>

            {client.notes ? (
              <p className="rounded-lg bg-muted p-3 text-muted-foreground">{client.notes}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Invoice history</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link to={`/invoices?${invoiceSearchParams.toString()}`}>View in invoices</Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {client.invoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Invoices you create for this client will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead className="hidden sm:table-cell">Issue date</TableHead>
                      <TableHead className="hidden sm:table-cell">Due date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {client.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          <Link to={`/invoices/${invoice.id}`} className="hover:underline text-primary">
                            {invoice.number}
                          </Link>
                        </TableCell>

                        <TableCell className="hidden sm:table-cell">
                          {formatDate(invoice.issueDate)}
                        </TableCell>

                        <TableCell className="hidden sm:table-cell">
                          {formatDate(invoice.dueDate)}
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          {formatIDR(invoice.items ? invoiceTotals(invoice.items).total : 0)}
                        </TableCell>

                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status as any} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}