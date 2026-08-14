import { useEffect, useState } from "react";
import { Loader2, MoreHorizontal, Plus, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { EmptyState, PageHeader } from "~/components/common/page-parts";
import { ConfirmationDialog } from "~/components/common/controls";
import { RecurringStatusBadge } from "~/components/common/status-badges";
import { ItemsEditor, TotalsSummary, emptyItem } from "~/components/invoices/invoice-parts";
import { useAppStore } from "~/store/app-store";
import { recurringSchema } from "~/lib/validation";
import { addDaysISO, formatDate, formatIDR, todayISO } from "~/lib/format";
import { PAYMENT_TERMS, invoiceTotals, paymentTermDays, type InvoiceItem, type PaymentTerm, type RecurringFrequency } from "~/data/types";
import { axiosInstance } from "~/lib/axios";

export function meta() {
  return [
    { title: "Recurring Invoices — Fakturia" },
    { name: "description", content: "Automate repeat billing with weekly, monthly, quarterly or yearly schedules." },
  ];
}

const FREQUENCIES: { value: RecurringFrequency; label: string; days: number }[] = [
  { value: "weekly", label: "Weekly", days: 7 },
  { value: "monthly", label: "Monthly", days: 30 },
  { value: "quarterly", label: "Quarterly", days: 90 },
  { value: "yearly", label: "Yearly", days: 365 },
];

export default function RecurringPage() {
  const { invoiceSettings } = useAppStore();

  const [recurring, setRecurring] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const [clientId, setClientId] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm>(invoiceSettings.defaultPaymentTerms);
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [statusTarget, setStatusTarget] = useState<{ schedule: any; status: "paused" | "active" | "cancelled" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [invRes, cliRes, prodRes] = await Promise.all([
        axiosInstance.get("/invoice?isRecurring=true"),
        axiosInstance.get("/client"),
        axiosInstance.get("/product"),
      ]);

      const recurringData = (invRes.data.data || []).filter((inv: any) => inv.isRecurring);

      const mappedRecurring = recurringData.map((inv: any) => ({
        ...inv,
        frequency: inv.recurringInterval ? inv.recurringInterval.toLowerCase() : "monthly",
        startDate: inv.issueDate,
        endDate: inv.endDate ? inv.endDate.slice(0, 10) : null,
        status: inv.reccurringStatus ? String(inv.recurringStatus).toLowerCase() : "active",
        items: inv.items.map((item: any) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount || 0),
          tax: Number(item.tax || 0),
        })),
      }));

      setRecurring(mappedRecurring);
      setClients(cliRes.data.data || []);
      setProducts(prodRes.data.data || []);
    } catch (error) {
      console.error("Failed to fetch recurring invoices", error);
      toast.error("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const clientName = (id: string) => {
    const client = clients.find((c) => c.id === id);
    return client ? client.company || client.name : "Unknown client";
  };

  const openForm = (schedule: any | null) => {
    setEditing(schedule);
    setErrors({});

    setClientId(schedule?.clientId ?? "");
    setFrequency(schedule?.frequency ?? "monthly");
    setStartDate(schedule?.startDate ? schedule.startDate.slice(0, 10) : todayISO());
    setEndDate(schedule?.endDate ?? "");
    setPaymentTerms(schedule?.paymentTerms ?? invoiceSettings.defaultPaymentTerms);
    setItems(schedule ? schedule.items.map((item: any) => ({ ...item })) : [emptyItem()]);

    setOpen(true);
  };

  const submit = async () => {
    const result = recurringSchema.safeParse({ clientId, frequency, startDate, endDate, paymentTerms, items });

    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    const days = FREQUENCIES.find((f) => f.value === frequency)?.days ?? 30;

    const payload = {
      clientId,
      dueDate: startDate, 
      paymentTerms,
      isRecurring: true,
      recurringInterval: frequency.toUpperCase(),
      nextRecurringDate: addDaysISO(startDate, days),
      items: items.map((item) => ({
        productId: item.productId || undefined,
        name: item.name,
        description: item.description,
        quantity: Number(item.quantity),
        price: Number(item.unitPrice),
        discount: Number(item.discount),
        tax: Number(item.tax),
      })),
    };

    setIsSubmitting(true);
    try {
      if (editing) {
        await axiosInstance.patch(`/invoice/${editing.id}`, payload);
        toast.success("Recurring invoice updated");
      } else {
        await axiosInstance.post("/invoice", payload);
        toast.success("Recurring invoice created");
      }
      setOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save recurring invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusTarget) return;

    try {      
      await axiosInstance.patch(`/invoice/${statusTarget.schedule.id}/status`, {
        recurringStatus: statusTarget.status.toUpperCase(),
      });

      toast.success(`Schedule ${statusTarget.status}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setStatusTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await axiosInstance.delete(`/invoice/${deleteTarget.id}`);
      toast.success("Schedule deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete schedule");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Recurring Invoices"
        description="Schedules that generate invoices automatically."
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus className="size-4 mr-2" aria-hidden />
            New schedule
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : recurring.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="No recurring invoices"
              description="Set up a schedule to bill retainer clients automatically."
              action={
                <Button onClick={() => openForm(null)}>New schedule</Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden sm:table-cell">Frequency</TableHead>
                    <TableHead className="hidden md:table-cell">Next invoice</TableHead>
                    <TableHead className="hidden lg:table-cell">Ends</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {recurring.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{clientName(schedule.clientId)}</TableCell>
                      <TableCell className="hidden capitalize sm:table-cell">{schedule.frequency}</TableCell>
                      <TableCell className="hidden md:table-cell">{schedule.nextRecurringDate ? formatDate(schedule.nextRecurringDate) : "-"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{schedule.endDate ? formatDate(schedule.endDate) : "No end date"}</TableCell>
                      <TableCell className="text-right font-medium">{formatIDR(invoiceTotals(schedule.items).total)}</TableCell>
                      <TableCell>
                        <RecurringStatusBadge status={schedule.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for schedule`}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openForm(schedule)}>Edit</DropdownMenuItem>

                            {schedule.status === "active" && (
                              <DropdownMenuItem onSelect={() => setStatusTarget({ schedule, status: "paused" })}>Pause</DropdownMenuItem>
                            )}

                            {schedule.status === "paused" && (
                              <DropdownMenuItem onSelect={() => setStatusTarget({ schedule, status: "active" })}>Resume</DropdownMenuItem>
                            )}

                            {schedule.status !== "cancelled" && (
                              <DropdownMenuItem className="text-destructive" onSelect={() => setStatusTarget({ schedule, status: "cancelled" })}>
                                Cancel schedule
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteTarget(schedule)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit schedule" : "New recurring invoice"}</DialogTitle>
            <DialogDescription>Invoices are generated automatically on the schedule you choose.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="r-client">Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="r-client"><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors["clientId"] && <p className="text-sm text-destructive">{errors["clientId"]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-freq">Frequency</Label>
              <Select value={frequency} onValueChange={(val) => setFrequency(val as RecurringFrequency)}>
                <SelectTrigger id="r-freq"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-terms">Payment terms</Label>
              <Select value={paymentTerms} onValueChange={(val) => setPaymentTerms(val as PaymentTerm)}>
                <SelectTrigger id="r-terms"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Due {paymentTermDays(paymentTerms)} days after each issue date.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-start">Start date</Label>
              <Input id="r-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-end">End date (optional)</Label>
              <Input id="r-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              {errors["endDate"] && <p className="text-sm text-destructive">{errors["endDate"]}</p>}
            </div>

            <div className="sm:col-span-2">
              <ItemsEditor items={items} products={products} onChange={setItems} error={errors["items"]} />
              <div className="ml-auto mt-6 w-full max-w-xs">
                <TotalsSummary items={items} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={submit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editing ? "Save changes" : "Create schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={statusTarget !== null}
        onOpenChange={(isOpen) => !isOpen && setStatusTarget(null)}
        title={statusTarget?.status === "cancelled" ? "Cancel this schedule?" : statusTarget?.status === "paused" ? "Pause this schedule?" : "Resume this schedule?"}
        description={statusTarget?.status === "cancelled" ? "No further invoices will be generated for this client." : statusTarget?.status === "paused" ? "Invoice generation stops until you resume the schedule." : "Invoices will be generated again from the next scheduled date."}
        confirmLabel="Confirm"
        destructive={statusTarget?.status === "cancelled"}
        onConfirm={handleUpdateStatus}
      />

      <ConfirmationDialog
        open={deleteTarget !== null}
        onOpenChange={(isOpen) => !isOpen && setDeleteTarget(null)}
        title="Delete this schedule?"
        description="This removes the recurring schedule. Invoices already generated are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}