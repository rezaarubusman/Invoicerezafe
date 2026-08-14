import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { FileText, MoreHorizontal, Plus, Loader2, LayoutGrid, List, Settings2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "~/components/ui/dialog";
import { PageHeader, EmptyState } from "~/components/common/page-parts";
import { Pagination } from "~/components/common/controls";
import { InvoiceStatusBadge } from "~/components/common/status-badges";
import { useAppStore } from "~/store/app-store";
import { invoiceTotals, type InvoiceStatus } from "~/data/types";
import { formatDate, formatIDR } from "~/lib/format";
import { axiosInstance } from "~/lib/axios"; 

export function meta() {
  return [
    { title: "Invoice List — Fakturia" },
    { name: "description", content: "List of invoices" },
  ];
}

const PAGE_SIZE = 8;

export default function InvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { clients } = useAppStore(); 

  const [invoices, setInvoices] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: PAGE_SIZE });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  
  const [settingsOpen, setSettingsOpen] = useState(false);

  const searchParam = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status") ?? "all";
  const clientParam = searchParams.get("client") ?? "all";
  const sortParam = searchParams.get("sort") ?? "issueDate";
  const dirParam = searchParams.get("dir") ?? "desc";
  const pageParam = Number(searchParams.get("page") ?? "1");

  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [tempSettings, setTempSettings] = useState({
    sort: sortParam,
    dir: dirParam,
    status: statusParam,
    client: clientParam,
  });

  const setParam = (patch: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === "all" || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== searchParam) {
        setParam({ search: searchTerm, page: 1 });
      }
    }, 500); 
    return () => clearTimeout(handler);
  }, [searchTerm, searchParam]);

  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const query = new URLSearchParams({
        search: searchParam,
        status: statusParam,
        client: clientParam,
        sort: sortParam,
        dir: dirParam,
        page: String(pageParam),
        limit: String(PAGE_SIZE),
      }).toString();

      const response = await axiosInstance.get(`/invoice?${query}`);
      const { data, meta } = response.data;
      
      const mappedInvoices = data.map((inv: any) => ({
        ...inv,
        number: inv.number, 
        items: inv.items.map((item: any) => ({
          ...item,
          unitPrice: Number(item.unitPrice), 
          discount: Number(item.discount || 0), 
          tax: Number(item.tax || 0),      
        }))
      }));

      setInvoices(mappedInvoices);
      setMeta(meta);
    } catch (err: any) {
      console.error("Failed to fetch invoices:", err);
      setError("Gagal mengambil data invoice.");
    } finally {
      setIsLoading(false);
    }
  }, [searchParam, statusParam, clientParam, sortParam, dirParam, pageParam]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const clientName = (invoice: any) => {
    if (invoice.client) return invoice.client.company || invoice.client.name;
    const client = clients.find((item) => item.id === invoice.clientId);
    return client ? client.company || client.name : "Unknown client";
  };

  const applySettings = () => {
    setParam({
      sort: tempSettings.sort,
      dir: tempSettings.dir,
      status: tempSettings.status,
      client: tempSettings.client,
      page: 1, 
    });
    setSettingsOpen(false);
  };

  const changePage = (newPage: number) => {
    setParam({ page: newPage });
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Every invoice, filtered exactly the way you need it."
        actions={
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="size-4 mr-2" aria-hidden />
              New Invoice
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
        <div className="w-full sm:max-w-md relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice number or client..."
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode("table")}
            >
              <List className="size-4" />
            </Button>
          </div>

          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings2 className="size-4" />
                Sort & Filter
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pb-2 border-b">
                  <Settings2 className="size-5 text-primary" />
                  List Settings
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="w-4 h-[2px] bg-primary rounded-full"></span>
                    Sorting & Primary Metric
                  </h4>
                  <p className="text-xs text-muted-foreground">Determines sorting order of invoices.</p>
                  <div className="flex gap-2">
                    <Select value={tempSettings.sort} onValueChange={(v) => setTempSettings({...tempSettings, sort: v})}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="issueDate">Issue Date</SelectItem>
                        <SelectItem value="dueDate">Due Date</SelectItem>
                        <SelectItem value="number">Invoice Number</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={tempSettings.dir} onValueChange={(v) => setTempSettings({...tempSettings, dir: v})}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Desc</SelectItem>
                        <SelectItem value="asc">Asc</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="w-4 h-[2px] bg-primary rounded-full"></span>
                    Filters
                  </h4>
                  <p className="text-xs text-muted-foreground">Select which statuses and clients to display.</p>
                  <div className="space-y-3">
                    <Select value={tempSettings.status} onValueChange={(v) => setTempSettings({...tempSettings, status: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {["draft", "pending", "paid", "overdue", "cancelled"].map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={tempSettings.client} onValueChange={(v) => setTempSettings({...tempSettings, client: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t">
                <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={applySettings}>
                  Apply
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64 text-red-500">
          <p>{error}</p>
        </div>
      ) : invoices.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <EmptyState
              icon={FileText}
              title="No invoices match your criteria"
              description="Try adjusting your search, sort, or filters to see more results."
              action={
                <Button asChild>
                  <Link to="/invoices/new">Create invoice</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id} className="shadow-sm flex flex-col">
                  <CardHeader className="pb-3 border-b space-y-0 flex-row justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg leading-none mb-1">
                        <Link to={`/invoices/${invoice.id}`} className="hover:underline">
                          {invoice.number}
                        </Link>
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{clientName(invoice)}</p>
                    </div>
                    <InvoiceStatusBadge status={String(invoice.status).toLowerCase() as InvoiceStatus} />
                  </CardHeader>
                  <CardContent className="py-4 text-sm space-y-2 flex-grow">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issue Date:</span>
                      <span className="font-medium">{formatDate(invoice.issueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due Date:</span>
                      <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t mt-2">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-bold text-base">{formatIDR(invoiceTotals(invoice.items).total)}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-4">
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/invoices/${invoice.id}`}>View invoice</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-sm mb-4">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="hidden md:table-cell">Issue Date</TableHead>
                        <TableHead className="hidden md:table-cell">Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            <Link to={`/invoices/${invoice.id}`} className="hover:underline">
                              {invoice.number}
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-48 truncate">
                            {clientName(invoice)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDate(invoice.issueDate)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDate(invoice.dueDate)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatIDR(invoiceTotals(invoice.items).total)}
                          </TableCell>
                          <TableCell>
                            <InvoiceStatusBadge status={String(invoice.status).toLowerCase() as InvoiceStatus} />
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/invoices/${invoice.id}`}>View invoice</Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Pagination
            page={meta.page}
            pageCount={meta.totalPages}
            total={meta.total}
            pageSize={meta.limit}
            onPageChange={changePage}
          />
        </>
      )}
    </>
  );
}