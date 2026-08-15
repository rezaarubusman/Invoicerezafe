import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { PageHeader } from "~/components/common/page-parts";
import { ConfirmationDialog } from "~/components/common/controls";
import { InvoicePreview, ItemsEditor, TotalsSummary, emptyItem } from "~/components/invoices/invoice-parts";
import { useAppStore } from "~/store/app-store";
import { invoiceSchema } from "~/lib/validation";
import { addDaysISO, formatIDR, todayISO } from "~/lib/format";
import { PAYMENT_TERMS, invoiceTotals, paymentTermDays, type InvoiceItem, type PaymentTerm } from "~/data/types";
import { axiosInstance } from "~/lib/axios";

export function meta() {
  return [
    { title: "New Invoice — Fakturia" },
    { name: "description", content: "Make a new invoice" },
  ];
}

export default function NewInvoicePage() {
  const navigate = useNavigate();

  const { business, invoiceSettings, nextInvoiceNumber } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [previewNumber] = useState(() => nextInvoiceNumber());

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());

  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm>(invoiceSettings.defaultPaymentTerms);
  const [dueDate, setDueDate] = useState(addDaysISO(todayISO(), paymentTermDays(invoiceSettings.defaultPaymentTerms)));

  const [notes, setNotes] = useState(invoiceSettings.defaultNotes);
  const [terms, setTerms] = useState(invoiceSettings.defaultTerms);

  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [clientsRes, productsRes] = await Promise.all([
          axiosInstance.get("/client"),
          axiosInstance.get("/product"),
        ]);
        
        setClients(clientsRes.data.data || []);
        setProducts(productsRes.data.data || []);
      } catch (error) {
        console.error("Failed to fetch initial data", error);
        toast.error("Failed to load clients and products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const client = clients.find((c) => c.id === clientId);
  const totals = invoiceTotals(items);

  const values = {
    number: previewNumber, 
    clientId,
    issueDate,
    dueDate,
    paymentTerms,
    currency: invoiceSettings.currency,
    notes,
    terms,
    items,
  };

  const validate = () => {
    const result = invoiceSchema.safeParse(values);

    if (result.success) {
      setErrors({});
      return true;
    }

    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (!next[key]) {
        next[key] = issue.message;
      }
    }

    setErrors(next);
    toast.error("Please fix the highlighted fields");
    return false;
  };

  const save = async (status: "draft" | "pending") => {
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        number: previewNumber,
        currency: invoiceSettings.currency || "IDR",
        clientId,
        dueDate,
        paymentTerms,
        terms,
        notes,
        isRecurring: false,
        status: status.toUpperCase(),
        items: items.map((item) => ({
          productId: item.productId || undefined,
          name: item.name,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice), 
          discount: Number(item.discount || 0),
          tax: Number(item.tax || 0),
        })),
      };

      const response = await axiosInstance.post("/invoice", payload);
      const newInvoiceId = response.data.data.id;

      toast.success(status === "draft" ? "Draft saved successfully" : "Invoice created successfully");
      navigate(`/invoices/${newInvoiceId}`);
    } catch (error: any) {
      console.error("Failed to save invoice", error);
      toast.error(error?.response?.data?.message || "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTerms = (term: PaymentTerm) => {
    setPaymentTerms(term);
    setDueDate(addDaysISO(issueDate, paymentTermDays(term)));
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/invoices">
          <ArrowLeft className="size-4 mr-2" aria-hidden />
          Back to invoices
        </Link>
      </Button>

      <PageHeader
        title="New invoice"
        description={`Creating new invoice · totals update as you type.`}
        actions={
          <>
            <Button variant="outline" disabled={isSubmitting} onClick={() => save("draft")}>
              {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save draft
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={() => {
                if (validate()) setConfirmOpen(true);
              }}
            >
              Create invoice
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Invoice details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="client" className="text-sm font-medium">Client</label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company || c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && <p className="text-sm text-destructive">{errors.clientId}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="issue" className="text-sm font-medium">Issue date</label>
                <Input
                  id="issue"
                  type="date"
                  value={issueDate}
                  onChange={(e) => {
                    const newIssueDate = e.target.value;
                    setIssueDate(newIssueDate);
                    setDueDate(addDaysISO(newIssueDate, paymentTermDays(paymentTerms)));
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="due" className="text-sm font-medium">Due date</label>
                <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate}</p>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="terms" className="text-sm font-medium">Payment terms</label>
                <Select value={paymentTerms} onValueChange={(value) => applyTerms(value as PaymentTerm)}>
                  <SelectTrigger id="terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((term) => (
                      <SelectItem key={term.value} value={term.value}>{term.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <ItemsEditor items={items} products={products} onChange={setItems} error={errors.items} />
              <div className="ml-auto mt-6 w-full max-w-xs">
                <TotalsSummary items={items} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Notes & terms</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="notes" className="text-sm font-medium">Notes for the client</label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tnc" className="text-sm font-medium">Terms and conditions</label>
                <Textarea id="tnc" value={terms} onChange={(e) => setTerms(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <InvoicePreview
            number={previewNumber}
            issueDate={issueDate}
            dueDate={dueDate}
            client={client}
            items={items}
            notes={notes}
            terms={terms}
            businessName={business.name}
            businessAddress={business.address}
          />
        </div>
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Create this invoice?"
        description="The invoice will be marked as pending and ready to send."
        confirmLabel={isSubmitting ? "Creating..." : "Create invoice"}
        onConfirm={() => {
          setConfirmOpen(false);
          save("pending");
        }}
      >
        <ul className="space-y-1 text-muted-foreground">
          <li>Client: <span className="text-foreground">{client?.company || client?.name}</span></li>
          <li>Items: <span className="text-foreground">{items.length}</span></li>
          <li>Total: <span className="font-semibold text-foreground">{formatIDR(totals.total)}</span></li>
        </ul>
      </ConfirmationDialog>
    </>
  );
}