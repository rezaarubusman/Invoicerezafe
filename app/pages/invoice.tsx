import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { FileText, MoreHorizontal, Plus } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { PageHeader, EmptyState } from "~/components/common/page-parts";
import { Pagination, SearchInput } from "~/components/common/controls";
import { InvoiceStatusBadge } from "~/components/common/status-badges";
import { useAppStore } from "~/store/app-store";
import { invoiceTotals, type InvoiceStatus } from "~/data/types";
import { formatDate, formatIDR } from "~/lib/format";
import { parseInvoiceSearch, type InvoiceSearch } from "~/lib/invoice-search";

export function meta() {
  return [
    {
      title: "Invoice List — Fakturia",
    },
    {
      name: "description",
      content: "List of invoices",
    },
    {
      property: "og:title",
      content: "Invoice List — Fakturia",
    },
    {
      property: "og:description",
      content: "List of invoices.",
    },
  ];
}

const PAGE_SIZE = 8;

export default function InvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { invoices, clients } = useAppStore();

  const search: InvoiceSearch = useMemo(() => {
    return parseInvoiceSearch({
      search: searchParams.get("search") ?? "",
      status: searchParams.get("status") ?? "all",
      client: searchParams.get("client") ?? "all",
      from: searchParams.get("from") ?? "",
      to: searchParams.get("to") ?? "",
      sort: searchParams.get("sort") ?? "issueDate",
      dir: searchParams.get("dir") ?? "desc",
      page: Number(searchParams.get("page") ?? "1"),
    });
  }, [searchParams]);

  const setParam = (patch: Partial<InvoiceSearch>) => {
    const next: InvoiceSearch = {
      ...search,
      page: 1,
      ...patch,
    };

    const params = new URLSearchParams();

    if (next.search) {
      params.set("search", next.search);
    }

    if (next.status !== "all") {
      params.set("status", next.status);
    }

    if (next.client !== "all") {
      params.set("client", next.client);
    }

    if (next.from) {
      params.set("from", next.from);
    }

    if (next.to) {
      params.set("to", next.to);
    }

    if (next.sort !== "issueDate") {
      params.set("sort", next.sort);
    }

    if (next.dir !== "desc") {
      params.set("dir", next.dir);
    }

    if (next.page !== 1) {
      params.set("page", String(next.page));
    }

    setSearchParams(params);
  };

  const clientName = (id: string) => {
    const client = clients.find((item) => item.id === id);

    return client
      ? client.company || client.name
      : "Unknown client";
  };

  const filtered = useMemo(() => {
    const term = search.search.trim().toLowerCase();

    const rows = invoices.filter((invoice) => {
      if (
        search.status !== "all" &&
        invoice.status !== search.status
      ) {
        return false;
      }

      if (
        search.client !== "all" &&
        invoice.clientId !== search.client
      ) {
        return false;
      }

      if (
        search.from &&
        invoice.issueDate < search.from
      ) {
        return false;
      }

      if (
        search.to &&
        invoice.issueDate > search.to
      ) {
        return false;
      }

      if (term) {
        const haystack = `
          ${invoice.number}
          ${clientName(invoice.clientId)}
        `.toLowerCase();

        if (!haystack.includes(term)) {
          return false;
        }
      }

      return true;
    });

    const dir = search.dir === "asc" ? 1 : -1;

    return rows.sort((a, b) => {
      if (search.sort === "amount") {
        return (
          invoiceTotals(a.items).total -
          invoiceTotals(b.items).total
        ) * dir;
      }

      if (search.sort === "dueDate") {
        return (
          a.dueDate.localeCompare(b.dueDate) * dir
        );
      }

      if (search.sort === "number") {
        return (
          a.number.localeCompare(b.number) * dir
        );
      }

      return (
        a.issueDate.localeCompare(b.issueDate) * dir
      );
    });
  }, [invoices, clients, search]);

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE),
  );

  const page = Math.min(
    Math.max(search.page, 1),
    pageCount,
  );

  const rows = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const filtersActive =
    search.search !== "" ||
    search.status !== "all" ||
    search.client !== "all" ||
    search.from !== "" ||
    search.to !== "";

  const resetFilters = () => {
    setSearchParams({
      sort: search.sort,
      dir: search.dir,
    });
  };

  const changePage = (newPage: number) => {
    const next = new URLSearchParams(searchParams);

    if (newPage === 1) {
      next.delete("page");
    } else {
      next.set("page", String(newPage));
    }

    setSearchParams(next);
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Every invoice, filtered exactly the way you need it."
        actions={
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="size-4" aria-hidden />
              New Invoice
            </Link>
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
            <SearchInput
              value={search.search}
              onChange={(value) =>
                setParam({ search: value })
              }
              placeholder="Search invoice number or client"
              label="Search invoices"
            />

            <Select
              value={search.status}
              onValueChange={(value) =>
                setParam({
                  status: value as InvoiceStatus | "all",
                })
              }
            >
              <SelectTrigger aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All statuses
                </SelectItem>

                {(
                  [
                    "draft",
                    "pending",
                    "paid",
                    "overdue",
                    "cancelled",
                  ] as InvoiceStatus[]
                ).map((status) => (
                  <SelectItem
                    key={status}
                    value={status}
                    className="capitalize"
                  >
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={search.client}
              onValueChange={(value) =>
                setParam({ client: value })
              }
            >
              <SelectTrigger aria-label="Filter by client">
                <SelectValue placeholder="Client" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All clients
                </SelectItem>

                {clients.map((client) => (
                  <SelectItem
                    key={client.id}
                    value={client.id}
                  >
                    {client.company || client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              aria-label="Issued from"
              value={search.from}
              onChange={(event) =>
                setParam({
                  from: event.target.value,
                })
              }
            />

            <Input
              type="date"
              aria-label="Issued to"
              value={search.to}
              onChange={(event) =>
                setParam({
                  to: event.target.value,
                })
              }
            />

            <Button
              variant="outline"
              disabled={!filtersActive}
              onClick={resetFilters}
            >
              Reset filters
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Sort by</span>

            <Select
              value={search.sort}
              onValueChange={(value) =>
                setParam({
                  sort: value as InvoiceSearch["sort"],
                })
              }
            >
              <SelectTrigger
                className="w-40"
                aria-label="Sort field"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="issueDate">
                  Issue date
                </SelectItem>

                <SelectItem value="dueDate">
                  Due date
                </SelectItem>

                <SelectItem value="amount">
                  Amount
                </SelectItem>

                <SelectItem value="number">
                  Invoice number
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={search.dir}
              onValueChange={(value) =>
                setParam({
                  dir: value as InvoiceSearch["dir"],
                })
              }
            >
              <SelectTrigger
                className="w-32"
                aria-label="Sort direction"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="desc">
                  Descending
                </SelectItem>

                <SelectItem value="asc">
                  Ascending
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={
                filtersActive
                  ? "No invoices match your filters"
                  : "No invoices yet"
              }
              description={
                filtersActive
                  ? "Try adjusting or resetting the filters to see more results."
                  : "Create your first invoice to start tracking payments."
              }
              action={
                <Button asChild>
                  <Link to="/invoices/new">
                    Create invoice
                  </Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Invoice Number
                      </TableHead>

                      <TableHead>
                        Client
                      </TableHead>

                      <TableHead className="hidden md:table-cell">
                        Issue Date
                      </TableHead>

                      <TableHead className="hidden md:table-cell">
                        Due Date
                      </TableHead>

                      <TableHead className="text-right">
                        Amount
                      </TableHead>

                      <TableHead>
                        Status
                      </TableHead>

                      <TableHead className="w-12 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {rows.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="hover:underline"
                          >
                            {invoice.number}
                          </Link>
                        </TableCell>

                        <TableCell className="max-w-48 truncate">
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

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Actions for ${invoice.number}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  to={`/invoices/${invoice.id}`}
                                >
                                  View invoice
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                page={page}
                pageCount={pageCount}
                total={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={changePage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}