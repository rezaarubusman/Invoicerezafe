import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, CheckCircle2, Copy, Download, FileText, Pencil, Send, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { EmptyState, PageHeader } from "~/components/common/page-parts";
import { ConfirmationDialog } from "~/components/common/controls";
import { InvoiceStatusBadge } from "~/components/common/status-badges";
import { InvoicePreview } from "~/components/invoices/invoice-parts";
import { useAppStore } from "~/store/app-store";
import { sendInvoiceSchema } from "~/lib/validation";
import { formatDate, formatIDR, todayISO } from "~/lib/format";
import { PAYMENT_METHODS, invoiceTotals, paymentTermLabel, type InvoiceStatus } from "~/data/types";
import { axiosInstance } from "~/lib/axios";

export function meta() {
  return [
    { title: "Invoice Detail — Fakturia" },
    { name: "description", content: "Invoice Detail" },
  ];
}

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

  const { business } = useAppStore();

  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    to: "",
    cc: "",
    subject: "",
    message: "",
  });
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({});

  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchInvoice = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(`/invoice/${invoiceId}`);
      const data = response.data.data;

      setInvoice({
        ...data,
        number: data.number,
        notes: data.notes || "", 
        terms: data.terms || "", 
        paymentTerms: data.paymentTerms || "due_on_receipt",
        status: String(data.status).toLowerCase(),
        
        items: data.items.map((item: any) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount), 
          tax: Number(item.tax),
        })),
        
        payment: data.status === "PAID" ? {
          date: data.paymentDate,
          method: data.paymentMethod,
          amount: Number(data.amountPaid),
          reference: data.paymentReference
        } : null,
        
        activity: data.activity || [], 
      });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast.error("Failed to load invoice data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) fetchInvoice();
  }, [invoiceId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <EmptyState
            icon={FileText}
            title="Invoice not found"
            description="This invoice may have been removed or you don't have access to it."
            action={
              <Button asChild>
                <Link to="/invoices">Back to invoices</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const client = invoice.client;
  const totals = invoiceTotals(invoice.items);

  const openSend = () => {
    setSendErrors({});
    setSendForm({
      to: client?.email ?? "",
      cc: "",
      subject: `Invoice ${invoice.number} from ${business.name}`,
      message: `Hi ${client?.name ?? "there"},\n\nPlease find invoice ${invoice.number} for ${formatIDR(totals.total)}, due on ${formatDate(invoice.dueDate)}.\n\nThank you,\n${business.name}`,
    });
    setSendOpen(true);
  };

  const submitSend = async () => {
    const result = sendInvoiceSchema.safeParse(sendForm);

    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setSendErrors(next);
      return;
    }

    try {
      setIsProcessing(true);
      if (invoice.status === "draft") {
        await axiosInstance.patch(`/invoice/${invoice.id}/status`, { status: "PENDING" });
      }
      toast.success("Invoice sent successfully");
      setSendOpen(false);
      fetchInvoice();
    } catch (error) {
      toast.error("Failed to send invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      setIsProcessing(true);
      
      const payload = {
        clientId: invoice.clientId,
        dueDate: invoice.dueDate,
        paymentTerms: invoice.paymentTerms,
        notes: invoice.notes,
        terms: invoice.terms,
        isRecurring: false,
        items: invoice.items.map((item: any) => ({
          productId: item.productId || undefined,
          name: item.name,
          description: item.description,
          quantity: Number(item.quantity),
          price: Number(item.unitPrice),
          discount: Number(item.discount),
          tax: Number(item.tax)
        })),
      };

      const res = await axiosInstance.post("/invoice", payload);
      const copy = res.data.data;
      
      toast.success(`Duplicated as ${copy.invoiceNumber}`);
      navigate(`/invoices/${copy.id}`);
    } catch (error) {
      toast.error("Failed to duplicate invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      setIsProcessing(true);
      await axiosInstance.patch(`/invoice/${invoice.id}/status`, { 
        status: "PAID",
        paymentMethod: "bank_transfer",
        paymentReference: `TRX-${invoice.number}`,
        amountPaid: totals.total
      });
      toast.success("Invoice marked as paid");
      setMarkPaidOpen(false);
      fetchInvoice();
    } catch (error) {
      toast.error("Failed to mark as paid");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsProcessing(true);
      await axiosInstance.patch(`/invoice/${invoice.id}/status`, { status: "CANCELLED" });
      toast.success("Invoice cancelled");
      setCancelOpen(false);
      fetchInvoice();
    } catch (error) {
      toast.error("Failed to cancel invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/invoices">
          <ArrowLeft className="size-4 mr-2" aria-hidden />
          Back to invoices
        </Link>
      </Button>

      <PageHeader
        title={invoice.number}
        description={`${client?.company || client?.name || "Unknown client"} · ${paymentTermLabel(invoice.paymentTerms || "due_on_receipt")}`}
        actions={
          <>
            <Button variant="outline" onClick={() => toast.info("Editing is disabled in this demo")}>
              <Pencil className="size-4 mr-2" aria-hidden /> Edit
            </Button>
            <Button variant="outline" onClick={handleDuplicate} disabled={isProcessing}>
              <Copy className="size-4 mr-2" aria-hidden /> Duplicate
            </Button>
            <Button variant="outline" onClick={() => toast.success("PDF download started (demo only)")}>
              <Download className="size-4 mr-2" aria-hidden /> Download PDF
            </Button>
            <Button onClick={openSend}>
              <Send className="size-4 mr-2" aria-hidden /> Send
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <InvoicePreview
            number={invoice.number}
            issueDate={invoice.issueDate}
            dueDate={invoice.dueDate}
            client={client}
            items={invoice.items}
            notes={invoice.notes}
            terms={invoice.terms}
            businessName={business.name}
            businessAddress={business.address}
          />
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
                <span className="text-lg font-semibold">{formatIDR(totals.total)}</span>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  disabled={invoice.status === "paid" || invoice.status === "cancelled" || isProcessing}
                  onClick={() => setMarkPaidOpen(true)}
                >
                  <CheckCircle2 className="size-4 mr-2" aria-hidden />
                  Mark as paid
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive"
                  disabled={invoice.status === "cancelled" || invoice.status === "paid" || isProcessing}
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="size-4 mr-2" aria-hidden />
                  Cancel invoice
                </Button>
              </div>
            </CardContent>
          </Card>

          {invoice.payment && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Payment information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Paid on</span>
                  <span>{formatDate(invoice.payment.date)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span>{PAYMENT_METHODS.find((m) => m.value === invoice.payment?.method)?.label ?? invoice.payment.method}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatIDR(invoice.payment.amount)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Reference</span>
                  <span>{invoice.payment.reference}</span>
                </p>
              </CardContent>
            </Card>
          )}

          {invoice.activity && invoice.activity.length > 0 && (
             <Card className="shadow-sm">
               <CardHeader>
                 <CardTitle className="text-base">Activity</CardTitle>
               </CardHeader>
               <CardContent>
                 <ol className="space-y-4">
                   {invoice.activity.map((entry: any) => (
                     <li key={entry.id} className="relative pl-6">
                       <span className="absolute left-0 top-1.5 size-2.5 rounded-full bg-primary" aria-hidden />
                       <p className="text-sm font-medium text-foreground">{entry.label}</p>
                       <p className="text-sm text-muted-foreground">{entry.description}</p>
                       <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                     </li>
                   ))}
                 </ol>
               </CardContent>
             </Card>
          )}
        </div>
      </div>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send invoice</DialogTitle>
            <DialogDescription>Review the email before sending {invoice.number} to your client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
             <div className="space-y-1.5">
              <Label htmlFor="send-to">To</Label>
              <Input id="send-to" value={sendForm.to} onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })} />
              {sendErrors.to && <p className="text-sm text-destructive">{sendErrors.to}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="send-cc">Cc (optional)</Label>
              <Input id="send-cc" value={sendForm.cc} placeholder="finance@company.com" onChange={(e) => setSendForm({ ...sendForm, cc: e.target.value })} />
              {sendErrors.cc && <p className="text-sm text-destructive">{sendErrors.cc}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="send-subject">Subject</Label>
              <Input id="send-subject" value={sendForm.subject} onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })} />
              {sendErrors.subject && <p className="text-sm text-destructive">{sendErrors.subject}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="send-message">Message</Label>
              <Textarea id="send-message" rows={6} value={sendForm.message} onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })} />
              {sendErrors.message && <p className="text-sm text-destructive">{sendErrors.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button onClick={submitSend} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />} Send invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        title="Mark this invoice as paid?"
        description={`${invoice?.number} will be recorded as fully paid today.`}
        confirmLabel={isProcessing ? "Processing..." : "Mark as paid"}
        onConfirm={handleMarkPaid}
      />

      <ConfirmationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this invoice?"
        description="Cancelled invoices stay in your records but are excluded from revenue."
        confirmLabel={isProcessing ? "Processing..." : "Cancel invoice"}
        cancelLabel="Keep invoice"
        destructive
        onConfirm={handleCancel}
      />
    </>
  );
}