import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router"; 
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Plus, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { EmptyState, PageHeader } from "~/components/common/page-parts";
import { ConfirmationDialog, SearchInput } from "~/components/common/controls";
import { useAppStore } from "~/store/app-store";
import { clientSchema, type ClientValues } from "~/lib/validation";
import { PAYMENT_TERMS, invoiceTotals, paymentTermLabel, type Client } from "~/data/types";
import { formatIDR } from "~/lib/format";
import { axiosInstance } from "~/lib/axios";

export function meta() {
  return [
    { title: "Clients — Fakturia" },
    {
      name: "description",
      content: "Manage client contacts, payment terms and outstanding balances.",
    },
  ];
}

const emptyClient: ClientValues = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Indonesia",
  paymentTerms: "net_30",
  notes: "",
};

export default function ClientsPage() {
  const { invoices } = useAppStore();

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [terms, setTerms] = useState("all");
  const [editing, setEditing] = useState<Client | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: emptyClient,
  });

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get("/client");
      
      const formattedClients: Client[] = res.data.data.map((c: any) => ({
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
      }));
      
      setClients(formattedClients);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch clients");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const totals = useMemo(() => {
    const map = new Map<
      string,
      {
        invoiced: number;
        outstanding: number;
      }
    >();

    for (const inv of invoices) {
      const total = invoiceTotals(inv.items).total;

      const entry = map.get(inv.clientId) ?? {
        invoiced: 0,
        outstanding: 0,
      };

      if (inv.status !== "cancelled" && inv.status !== "draft") {
        entry.invoiced += total;
      }

      if (inv.status === "pending" || inv.status === "overdue") {
        entry.outstanding += total;
      }

      map.set(inv.clientId, entry);
    }

    return map;
  }, [invoices]);

  const rows = clients.filter((client) => {
    if (terms !== "all" && client.paymentTerms !== terms) {
      return false;
    }

    const search = query.trim().toLowerCase();
    if (!search) {
      return true;
    }

    return `${client.name} ${client.company} ${client.email}`
      .toLowerCase()
      .includes(search);
  });

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

      <Card className="shadow-sm mb-4">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search name, company or email"
            label="Search clients"
          />

          <Select value={terms} onValueChange={setTerms}>
            <SelectTrigger aria-label="Filter by payment terms">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payment terms</SelectItem>
              {PAYMENT_TERMS.map((term) => (
                <SelectItem key={term.value} value={term.value}>
                  {term.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center p-10">
              <Loader2 className="animate-spin text-muted-foreground size-8" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients found"
              description="Add your first client to start sending invoices."
              action={
                <Button onClick={() => openForm(null)}>
                  Add client
                </Button>
              }
            />
          ) : (
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
                  {rows.map((client) => {
                    const total = totals.get(client.id) ?? {
                      invoiced: 0,
                      outstanding: 0,
                    };

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

                        <TableCell className="text-right">
                          {formatIDR(total.invoiced)}
                        </TableCell>

                        <TableCell className="text-right font-medium">
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
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit client" : "Add client"}</DialogTitle>
            <DialogDescription>Fields marked with * are required.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
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

            <div className="flex justify-end gap-2 sm:col-span-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
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