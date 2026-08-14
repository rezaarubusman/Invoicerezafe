import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router"; 
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Plus, Users, Loader2, LayoutGrid, List, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "~/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { EmptyState, PageHeader } from "~/components/common/page-parts";
import { ConfirmationDialog, Pagination } from "~/components/common/controls";
import { clientSchema, type ClientValues } from "~/lib/validation";
import { PAYMENT_TERMS, invoiceTotals, paymentTermLabel, type Client } from "~/data/types";
import { formatIDR } from "~/lib/format";
import { axiosInstance } from "~/lib/axios";

export function meta() {
  return [
    { title: "Clients — Fakturia" },
    { name: "description", content: "Manage client contacts, payment terms and outstanding balances." },
  ];
}

const emptyClient: ClientValues = {
  name: "", company: "", email: "", phone: "", address: "", city: "", state: "", postalCode: "", country: "Indonesia", paymentTerms: "net_30", notes: "",
};

const PAGE_SIZE = 8;

export default function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [totals, setTotals] = useState<Map<string, { invoiced: number; outstanding: number }>>(new Map());
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: PAGE_SIZE });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchParam = searchParams.get("search") ?? "";
  const termsParam = searchParams.get("terms") ?? "all";
  const sortParam = searchParams.get("sort") ?? "createdAt";
  const dirParam = searchParams.get("dir") ?? "desc";
  const pageParam = Number(searchParams.get("page") ?? "1");

  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [tempSettings, setTempSettings] = useState({
    sort: sortParam,
    dir: dirParam,
    terms: termsParam,
  });

  const form = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: emptyClient,
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

  const fetchClients = useCallback(async () => {
    try {
      setIsLoading(true);
      const query = new URLSearchParams({
        search: searchParam,
        terms: termsParam,
        sort: sortParam,
        dir: dirParam,
        page: String(pageParam),
        limit: String(PAGE_SIZE),
      }).toString();

      const res = await axiosInstance.get(`/client?${query}`);
      const { data, meta } = res.data;
      
      const newTotals = new Map<string, { invoiced: number; outstanding: number }>();

      const formattedClients: Client[] = data.map((c: any) => {
        let invoiced = 0;
        let outstanding = 0;

        if (c.invoices && Array.isArray(c.invoices)) {
          for (const inv of c.invoices) {
            const mappedItems = inv.items.map((item: any) => ({
              ...item,
              unitPrice: Number(item.unitPrice),
              discount: Number(item.discount || 0),
              tax: Number(item.tax || 0),
            }));

            const total = invoiceTotals(mappedItems).total;
            const status = String(inv.status).toLowerCase();

            if (status !== "cancelled" && status !== "draft") {
              invoiced += total;
            }

            if (status === "pending" || status === "overdue") {
              outstanding += total;
            }
          }
        }

        newTotals.set(c.id, { invoiced, outstanding });

        return {
          id: c.id,
          name: c.name,
          company: c.company || "",
          email: c.email,
          phone: c.phone || "",
          address: c.address || "",
          city: c.city || "",
          state: c.state || "",
          postalCode: c.postalCode || "",
          country: c.country || "Indonesia",
          paymentTerms: c.paymentTerms || "net_30",
          notes: c.notes || "",
          createdAt: c.createdAt,
        };
      });
      
      setTotals(newTotals);
      setClients(formattedClients);
      setMeta(meta);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch clients");
      setError("Gagal memuat data klien.");
    } finally {
      setIsLoading(false);
    }
  }, [searchParam, termsParam, sortParam, dirParam, pageParam]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const applySettings = () => {
    setParam({
      sort: tempSettings.sort,
      dir: tempSettings.dir,
      terms: tempSettings.terms,
      page: 1, 
    });
    setSettingsOpen(false);
  };

  const changePage = (newPage: number) => {
    setParam({ page: newPage });
  };

  const openForm = (client: Client | null) => {
    setEditing(client);
    form.reset(client ? { ...client, paymentTerms: client.paymentTerms as any } : emptyClient);
    setFormOpen(true);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await axiosInstance.patch(`/client/${editing.id}`, values);
        toast.success("Client updated successfully");
      } else {
        await axiosInstance.post("/client", values);
        toast.success("Client created successfully");
      }

      setFormOpen(false);
      fetchClients(); 
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Something went wrong");
    }
  });

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      setIsDeleting(true);
      await axiosInstance.delete(`/client/${toDelete.id}`);
      toast.success("Client deleted successfully");
      setToDelete(null);
      fetchClients(); 
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete client");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Clients"
        description="Everyone you invoice, with their terms and balances."
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus className="size-4 mr-2" aria-hidden="true" />
            Add client
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
        <div className="w-full sm:max-w-md relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, company or email..."
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
                  <p className="text-xs text-muted-foreground">Determines sorting order of clients.</p>
                  <div className="flex gap-2">
                    <Select value={tempSettings.sort} onValueChange={(v) => setTempSettings({...tempSettings, sort: v})}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Date Created</SelectItem>
                        <SelectItem value="name">Client Name</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
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
                  <p className="text-xs text-muted-foreground">Select payment terms to display.</p>
                  <Select value={tempSettings.terms} onValueChange={(v) => setTempSettings({...tempSettings, terms: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Payment Terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Terms</SelectItem>
                      {PAYMENT_TERMS.map((term) => (
                        <SelectItem key={term.value} value={term.value}>
                          {term.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          <Loader2 className="animate-spin text-muted-foreground size-8" />
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64 text-red-500">
          <p>{error}</p>
        </div>
      ) : clients.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <EmptyState
              icon={Users}
              title="No clients found"
              description="Add your first client or adjust your search filters."
              action={
                <Button onClick={() => openForm(null)}>
                  Add client
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {clients.map((client) => {
                const total = totals.get(client.id) ?? { invoiced: 0, outstanding: 0 };
                return (
                  <Card key={client.id} className="shadow-sm flex flex-col h-full border-border hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="text-center mb-6">
                        <h3 className="font-bold text-lg text-foreground line-clamp-1">{client.name}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-1">{client.company || "—"}</p>
                      </div>
                      
                      <div className="space-y-2 text-sm flex-grow mb-6">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground whitespace-nowrap">Email:</span>
                          <span className="font-medium truncate text-right">{client.email}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground whitespace-nowrap">Phone:</span>
                          <span className="font-medium text-right">{client.phone || "—"}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground whitespace-nowrap">Terms:</span>
                          <span className="font-medium text-right">{paymentTermLabel(client.paymentTerms as any)}</span>
                        </div>
                        <div className="flex justify-between gap-4 pt-2 border-t border-border/50">
                          <span className="text-muted-foreground whitespace-nowrap">Invoiced:</span>
                          <span className="font-bold text-right text-success">{formatIDR(total.invoiced)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground whitespace-nowrap">Outstanding:</span>
                          <span className="font-bold text-right text-warning">{formatIDR(total.outstanding)}</span>
                        </div>
                      </div>

                      <div className="space-y-2 mt-auto pt-2">
                        <Button asChild variant="outline" className="w-full font-semibold">
                          <Link to={`/clients/${client.id}`}>View</Link>
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="outline" className="w-1/2" onClick={() => openForm(client)}>
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-1/2 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20 hover:border-destructive" 
                            onClick={() => setToDelete(client)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="shadow-sm mb-4">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead className="hidden md:table-cell">Company</TableHead>
                        <TableHead className="hidden lg:table-cell">Email</TableHead>
                        <TableHead className="hidden lg:table-cell">Phone</TableHead>
                        <TableHead className="hidden sm:table-cell">Payment Terms</TableHead>
                        <TableHead className="text-right">Total Invoiced</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="w-12 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {clients.map((client) => {
                        const total = totals.get(client.id) ?? { invoiced: 0, outstanding: 0 };
                        return (
                          <TableRow key={client.id}>
                            <TableCell className="font-medium">
                              <Link to={`/clients/${client.id}`} className="hover:underline">
                                {client.name}
                              </Link>
                            </TableCell>
                            <TableCell className="hidden max-w-48 truncate md:table-cell">
                              {client.company || "—"}
                            </TableCell>
                            <TableCell className="hidden max-w-56 truncate lg:table-cell">
                              {client.email}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {client.phone || "—"}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {paymentTermLabel(client.paymentTerms as any)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatIDR(total.invoiced)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-warning">
                              {formatIDR(total.outstanding)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label={`Actions for ${client.name}`}>
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link to={`/clients/${client.id}`}>View</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openForm(client)}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setToDelete(client)}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary border-b pb-2">{editing ? "Edit client" : "Add client"}</DialogTitle>
            <DialogDescription>Fields marked with * are required.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 mt-2">
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="name">
                Client name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="name"
                {...form.register("name")}
                aria-invalid={!!form.formState.errors.name}
              />
              {form.formState.errors.name && (
                <FieldError>{form.formState.errors.name.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!form.formState.errors.company}>
              <FieldLabel htmlFor="company">Company</FieldLabel>
              <Input
                id="company"
                {...form.register("company")}
                aria-invalid={!!form.formState.errors.company}
              />
              {form.formState.errors.company && (
                <FieldError>{form.formState.errors.company.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!form.formState.errors.email}>
              <FieldLabel htmlFor="email">
                Email <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                aria-invalid={!!form.formState.errors.email}
              />
              {form.formState.errors.email && (
                <FieldError>{form.formState.errors.email.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!form.formState.errors.phone}>
              <FieldLabel htmlFor="phone">
                Phone <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="phone"
                {...form.register("phone")}
                aria-invalid={!!form.formState.errors.phone}
              />
              {form.formState.errors.phone && (
                <FieldError>{form.formState.errors.phone.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!form.formState.errors.address}>
              <FieldLabel htmlFor="address">
                Address <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="address"
                {...form.register("address")}
                aria-invalid={!!form.formState.errors.address}
              />
              {form.formState.errors.address && (
                <FieldError>{form.formState.errors.address.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!form.formState.errors.city}>
              <FieldLabel htmlFor="city">
                City <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="city"
                {...form.register("city")}
                aria-invalid={!!form.formState.errors.city}
              />
              {form.formState.errors.city && (
                <FieldError>{form.formState.errors.city.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!form.formState.errors.state}>
              <FieldLabel htmlFor="state">State / Province</FieldLabel>
              <Input
                id="state"
                {...form.register("state")}
                aria-invalid={!!form.formState.errors.state}
              />
              {form.formState.errors.state && (
                <FieldError>{form.formState.errors.state.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!form.formState.errors.postalCode}>
              <FieldLabel htmlFor="postalCode">
                Postal code <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="postalCode"
                {...form.register("postalCode")}
                aria-invalid={!!form.formState.errors.postalCode}
              />
              {form.formState.errors.postalCode && (
                <FieldError>{form.formState.errors.postalCode.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!form.formState.errors.country}>
              <FieldLabel htmlFor="country">
                Country <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="country"
                {...form.register("country")}
                aria-invalid={!!form.formState.errors.country}
              />
              {form.formState.errors.country && (
                <FieldError>{form.formState.errors.country.message}</FieldError>
              )}
            </Field>

            <Controller
              control={form.control}
              name="paymentTerms"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="paymentTerms">
                    Payment terms <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="paymentTerms" aria-invalid={fieldState.invalid}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((term) => (
                        <SelectItem key={term.value} value={term.value}>
                          {term.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Field className="sm:col-span-2" data-invalid={!!form.formState.errors.notes}>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                rows={3}
                {...form.register("notes")}
                aria-invalid={!!form.formState.errors.notes}
              />
              {form.formState.errors.notes && (
                <FieldError>{form.formState.errors.notes.message}</FieldError>
              )}
            </Field>

            <div className="flex justify-end gap-2 sm:col-span-2 mt-4 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {editing ? "Save changes" : "Add client"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setToDelete(null);
          }
        }}
        title="Delete this client?"
        description={`${toDelete?.name ?? ""} will be removed from your client list. This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete client"}
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}