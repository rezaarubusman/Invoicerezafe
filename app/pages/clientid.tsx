import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, FileText, Mail, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { EmptyState, PageHeader, StatCard } from "~/components/common/page-parts";
import { InvoiceStatusBadge } from "~/components/common/status-badges";
import { useAppStore } from "~/store/app-store";
import { invoiceTotals, paymentTermLabel } from "~/data/types";
import { formatDate, formatIDR } from "~/lib/format";
import { DEFAULT_INVOICE_SEARCH } from "~/lib/invoice-search";

export function meta() {
  return [
    {
      title: "Client details — Fakturia",
    },
    {
      name: "description",
      content:
        "Contact details, balances and invoice history for a client.",
    },
    {
      property: "og:title",
      content: "Client details — Fakturia",
    },
    {
      property: "og:description",
      content:
        "Contact details and invoice history for a client.",
    },
  ];
}

export default function ClientDetailPage() {
  /**
   * React Router:
   *
   * /clients/:clientId
   *
   * dibaca menggunakan useParams().
   */
  const { clientId } = useParams();

  const {
    clients,
    invoices,
  } = useAppStore();

  /**
   * Cari client berdasarkan ID dari URL.
   */
  const client = clients.find(
    (item) => item.id === clientId
  );

  /**
   * Semua invoice milik client ini.
   */
  const clientInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.clientId === clientId
      ),
    [invoices, clientId]
  );

  /**
   * Hitung statistik invoice client.
   */
  const stats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let outstanding = 0;

    for (const invoice of clientInvoices) {
      const amount =
        invoiceTotals(invoice.items).total;

      // Invoice cancelled tidak dihitung.
      if (invoice.status === "cancelled") {
        continue;
      }

      total += amount;

      if (invoice.status === "paid") {
        paid += amount;
      }

      if (
        invoice.status === "pending" ||
        invoice.status === "overdue"
      ) {
        outstanding += amount;
      }
    }

    return {
      total,
      paid,
      outstanding,
    };
  }, [clientInvoices]);

  /**
   * Jika client tidak ditemukan.
   */
  if (!client) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <EmptyState
            icon={FileText}
            title="Client not found"
            description="This client may have been removed from your workspace."
            action={
              <Button asChild>
                <Link to="/clients">
                  Back to clients
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  /**
   * React Router tidak memiliki:
   *
   * search={{
   *   ...
   * }}
   *
   * seperti TanStack Router.
   *
   * Kita membuat query string menggunakan
   * URLSearchParams.
   */
  const invoiceSearchParams =
    new URLSearchParams({
      search:
        DEFAULT_INVOICE_SEARCH.search,

      status:
        DEFAULT_INVOICE_SEARCH.status,

      from:
        DEFAULT_INVOICE_SEARCH.from,

      to:
        DEFAULT_INVOICE_SEARCH.to,

      sort:
        DEFAULT_INVOICE_SEARCH.sort,

      dir:
        DEFAULT_INVOICE_SEARCH.dir,

      page: String(
        DEFAULT_INVOICE_SEARCH.page
      ),

      client: client.id,
    });

  return (
    <>
      {/* Back button */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit"
      >
        <Link to="/clients">
          <ArrowLeft
            className="size-4"
            aria-hidden="true"
          />
          Back to clients
        </Link>
      </Button>

      {/* Page header */}
      <PageHeader
        title={client.company || client.name}
        description={`${client.name} · ${paymentTermLabel(
          client.paymentTerms
        )}`}
        actions={
          <Button asChild>
            <Link to="/invoices/new">
              New invoice
            </Link>
          </Button>
        }
      />

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total invoiced"
          value={formatIDR(stats.total)}
          icon={FileText}
        />

        <StatCard
          label="Paid"
          value={formatIDR(stats.paid)}
          icon={FileText}
          tone="success"
        />

        <StatCard
          label="Outstanding"
          value={formatIDR(
            stats.outstanding
          )}
          icon={FileText}
          tone="warning"
        />
      </div>

      {/* Client information + invoice history */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Contact information */}
        <Card className="shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">
              Contact information
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            {/* Email */}
            <p className="flex items-start gap-2">
              <Mail
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />

              <a
                href={`mailto:${client.email}`}
                className="hover:underline"
              >
                {client.email}
              </a>
            </p>

            {/* Phone */}
            <p className="flex items-start gap-2">
              <Phone
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />

              {client.phone}
            </p>

            {/* Address */}
            <p className="flex items-start gap-2">
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />

              <span>
                {client.address}

                <br />

                {client.city}
                {client.state
                  ? `, ${client.state}`
                  : ""}{" "}
                {client.postalCode}

                <br />

                {client.country}
              </span>
            </p>

            {/* Notes */}
            {client.notes ? (
              <p className="rounded-lg bg-muted p-3 text-muted-foreground">
                {client.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Invoice history */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">
              Invoice history
            </CardTitle>

            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <Link
                to={`/invoices?${invoiceSearchParams.toString()}`}
              >
                View in invoices
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {clientInvoices.length === 0 ? (
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
                      <TableHead>
                        Number
                      </TableHead>

                      <TableHead className="hidden sm:table-cell">
                        Issue date
                      </TableHead>

                      <TableHead className="hidden sm:table-cell">
                        Due date
                      </TableHead>

                      <TableHead className="text-right">
                        Amount
                      </TableHead>

                      <TableHead>
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {clientInvoices.map(
                      (invoice) => (
                        <TableRow
                          key={invoice.id}
                        >
                          <TableCell className="font-medium">
                            <Link
                              to={`/invoices/${invoice.id}`}
                              className="hover:underline"
                            >
                              {invoice.number}
                            </Link>
                          </TableCell>

                          <TableCell className="hidden sm:table-cell">
                            {formatDate(
                              invoice.issueDate
                            )}
                          </TableCell>

                          <TableCell className="hidden sm:table-cell">
                            {formatDate(
                              invoice.dueDate
                            )}
                          </TableCell>

                          <TableCell className="text-right font-medium">
                            {formatIDR(
                              invoiceTotals(
                                invoice.items
                              ).total
                            )}
                          </TableCell>

                          <TableCell>
                            <InvoiceStatusBadge
                              status={
                                invoice.status
                              }
                            />
                          </TableCell>
                        </TableRow>
                      )
                    )}
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
