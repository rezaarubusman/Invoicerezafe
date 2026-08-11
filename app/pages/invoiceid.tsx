import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, CheckCircle2, Copy, Download, FileText, Pencil, Send, XCircle } from "lucide-react";
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
import { PAYMENT_METHODS, invoiceTotals, paymentTermLabel } from "~/data/types";

export function meta() {
  return [
    {
      title: "Invoice Id — Fakturia",
    },
    {
      name: "description",
      content: "Invoice Id",
    },
    {
      property: "og:title",
      content: "Invoice Id — Fakturia",
    },
    {
      property: "og:description",
      content: "Invoice Id.",
    },
  ];
}

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

  const {
    invoices,
    clients,
    business,
    setInvoiceStatus,
    duplicateInvoice,
    logActivity,
  } = useAppStore();

  const invoice = invoices.find(
    (item) => item.id === invoiceId,
  );

  const client = clients.find(
    (item) => item.id === invoice?.clientId,
  );

  const [sendOpen, setSendOpen] = useState(false);

  const [sendForm, setSendForm] = useState({
    to: "",
    cc: "",
    subject: "",
    message: "",
  });

  const [sendErrors, setSendErrors] = useState<
    Record<string, string>
  >({});

  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!invoice) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <EmptyState
            icon={FileText}
            title="Invoice not found"
            description="This invoice may have been removed from your workspace."
            action={
              <Button asChild>
                <Link to="/invoices">
                  Back to invoices
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const totals = invoiceTotals(invoice.items);

  const openSend = () => {
    setSendErrors({});

    setSendForm({
      to: client?.email ?? "",
      cc: "",
      subject: `Invoice ${invoice.number} from ${business.name}`,
      message: `Hi ${client?.name ?? "there"},

Please find invoice ${invoice.number} for ${formatIDR(
        totals.total,
      )}, due on ${formatDate(invoice.dueDate)}.

Thank you,
${business.name}`,
    });

    setSendOpen(true);
  };

  const submitSend = () => {
    const result = sendInvoiceSchema.safeParse(sendForm);

    if (!result.success) {
      const next: Record<string, string> = {};

      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);

        if (!next[key]) {
          next[key] = issue.message;
        }
      }

      setSendErrors(next);
      return;
    }

    logActivity(
      invoice.id,
      "Invoice sent",
      `Emailed to ${sendForm.to}`,
    );

    if (invoice.status === "draft") {
      setInvoiceStatus(
        invoice.id,
        "pending",
      );
    }

    setSendOpen(false);

    toast.success("Invoice sent");
  };

  const handleDuplicate = () => {
    const copy = duplicateInvoice(invoice.id);

    if (!copy) {
      return;
    }

    toast.success(
      `Duplicated as ${copy.number}`,
    );

    navigate(`/invoices/${copy.id}`);
  };

  const handleMarkPaid = () => {
    setInvoiceStatus(invoice.id, "paid", {
      date: todayISO(),
      method: "bank_transfer",
      amount: totals.total,
      reference: `TRX-${invoice.number}`,
    });

    setMarkPaidOpen(false);

    toast.success(
      "Invoice marked as paid",
    );
  };

  const handleCancel = () => {
    setInvoiceStatus(
      invoice.id,
      "cancelled",
    );

    setCancelOpen(false);

    toast.success(
      "Invoice cancelled",
    );
  };

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit"
      >
        <Link to="/invoices">
          <ArrowLeft
            className="size-4"
            aria-hidden
          />
          Back to invoices
        </Link>
      </Button>

      <PageHeader
        title={invoice.number}
        description={`${client?.company || client?.name || "Unknown client"} · ${paymentTermLabel(
          invoice.paymentTerms,
        )}`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                toast.info(
                  "Editing is disabled in this demo",
                )
              }
            >
              <Pencil
                className="size-4"
                aria-hidden
              />
              Edit
            </Button>

            <Button
              variant="outline"
              onClick={handleDuplicate}
            >
              <Copy
                className="size-4"
                aria-hidden
              />
              Duplicate
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                toast.success(
                  "PDF download started (demo only)",
                )
              }
            >
              <Download
                className="size-4"
                aria-hidden
              />
              Download PDF
            </Button>

            <Button onClick={openSend}>
              <Send
                className="size-4"
                aria-hidden
              />
              Send
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
              <CardTitle className="text-base">
                Status
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <InvoiceStatusBadge
                  status={invoice.status}
                />

                <span className="text-lg font-semibold">
                  {formatIDR(totals.total)}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  disabled={
                    invoice.status === "paid" ||
                    invoice.status === "cancelled"
                  }
                  onClick={() =>
                    setMarkPaidOpen(true)
                  }
                >
                  <CheckCircle2
                    className="size-4"
                    aria-hidden
                  />
                  Mark as paid
                </Button>

                <Button
                  variant="outline"
                  className="text-destructive"
                  disabled={
                    invoice.status === "cancelled" ||
                    invoice.status === "paid"
                  }
                  onClick={() =>
                    setCancelOpen(true)
                  }
                >
                  <XCircle
                    className="size-4"
                    aria-hidden
                  />
                  Cancel invoice
                </Button>
              </div>
            </CardContent>
          </Card>

          {invoice.payment ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Payment information
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">
                    Paid on
                  </span>

                  <span>
                    {formatDate(
                      invoice.payment.date,
                    )}
                  </span>
                </p>

                <p className="flex justify-between">
                  <span className="text-muted-foreground">
                    Method
                  </span>

                  <span>
                    {PAYMENT_METHODS.find(
                      (method) =>
                        method.value ===
                        invoice.payment?.method,
                    )?.label ??
                      invoice.payment.method}
                  </span>
                </p>

                <p className="flex justify-between">
                  <span className="text-muted-foreground">
                    Amount
                  </span>

                  <span className="font-medium">
                    {formatIDR(
                      invoice.payment.amount,
                    )}
                  </span>
                </p>

                <p className="flex justify-between">
                  <span className="text-muted-foreground">
                    Reference
                  </span>

                  <span>
                    {invoice.payment.reference}
                  </span>
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Activity
              </CardTitle>
            </CardHeader>

            <CardContent>
              <ol className="space-y-4">
                {invoice.activity.map(
                  (entry) => (
                    <li
                      key={entry.id}
                      className="relative pl-6"
                    >
                      <span
                        className="absolute left-0 top-1.5 size-2.5 rounded-full bg-primary"
                        aria-hidden
                      />

                      <p className="text-sm font-medium text-foreground">
                        {entry.label}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {entry.description}
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(
                          entry.date,
                        )}
                      </p>
                    </li>
                  ),
                )}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={sendOpen}
        onOpenChange={setSendOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Send invoice
            </DialogTitle>

            <DialogDescription>
              Review the email before sending{" "}
              {invoice.number} to your client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* To */}
            <div className="space-y-1.5">
              <Label htmlFor="send-to">
                To
              </Label>

              <Input
                id="send-to"
                value={sendForm.to}
                onChange={(event) =>
                  setSendForm((form) => ({
                    ...form,
                    to: event.target.value,
                  }))
                }
              />

              {sendErrors.to ? (
                <p className="text-sm text-destructive">
                  {sendErrors.to}
                </p>
              ) : null}
            </div>

            {/* CC */}
            <div className="space-y-1.5">
              <Label htmlFor="send-cc">
                Cc (optional)
              </Label>

              <Input
                id="send-cc"
                value={sendForm.cc}
                placeholder="finance@company.com, ops@company.com"
                onChange={(event) =>
                  setSendForm((form) => ({
                    ...form,
                    cc: event.target.value,
                  }))
                }
              />

              {sendErrors.cc ? (
                <p className="text-sm text-destructive">
                  {sendErrors.cc}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="send-subject">
                Subject
              </Label>

              <Input
                id="send-subject"
                value={sendForm.subject}
                onChange={(event) =>
                  setSendForm((form) => ({
                    ...form,
                    subject:
                      event.target.value,
                  }))
                }
              />

              {sendErrors.subject ? (
                <p className="text-sm text-destructive">
                  {sendErrors.subject}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="send-message">
                Message
              </Label>

              <Textarea
                id="send-message"
                rows={6}
                value={sendForm.message}
                onChange={(event) =>
                  setSendForm((form) => ({
                    ...form,
                    message:
                      event.target.value,
                  }))
                }
              />

              {sendErrors.message ? (
                <p className="text-sm text-destructive">
                  {sendErrors.message}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setSendOpen(false)
              }
            >
              Cancel
            </Button>

            <Button onClick={submitSend}>
              Send invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        title="Mark this invoice as paid?"
        description={`${invoice.number} will be recorded as fully paid today.`}
        confirmLabel="Mark as paid"
        onConfirm={handleMarkPaid}
      />

      <ConfirmationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this invoice?"
        description="Cancelled invoices stay in your records but are excluded from revenue."
        confirmLabel="Cancel invoice"
        cancelLabel="Keep invoice"
        destructive
        onConfirm={handleCancel}
      />
    </>
  );
}
