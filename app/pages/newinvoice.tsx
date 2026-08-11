import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
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

export function meta() {
  return [
    {
      title: "New Invoice — Fakturia",
    },
    {
      name: "description",
      content: "Make a new invoice",
    },
    {
      property: "og:title",
      content: "New Invoice — Fakturia",
    },
    {
      property: "og:description",
      content: "Make a new invoice.",
    },
  ];
}

export default function NewInvoicePage() {
  const navigate = useNavigate();

  const {
    clients,
    products,
    business,
    invoiceSettings,
    addInvoice,
    nextInvoiceNumber,
  } = useAppStore();

  const [number] = useState(() => nextInvoiceNumber());

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());

  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm>(
    invoiceSettings.defaultPaymentTerms,
  );

  const [dueDate, setDueDate] = useState(
    addDaysISO(
      todayISO(),
      paymentTermDays(invoiceSettings.defaultPaymentTerms),
    ),
  );

  const [notes, setNotes] = useState(invoiceSettings.defaultNotes);
  const [terms, setTerms] = useState(invoiceSettings.defaultTerms);

  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const client = clients.find((c) => c.id === clientId);

  const totals = invoiceTotals(items);

  const values = {
    number,
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

  const save = (status: "draft" | "pending") => {
    if (!validate()) {
      return;
    }

    const invoice = addInvoice({
      ...values,
      notes,
      terms,
      status,
      payment: null,
      activity: [
        {
          id: `act-${Date.now()}`,
          date: todayISO(),
          label:
            status === "draft"
              ? "Invoice drafted"
              : "Invoice created",
          description: `Created for ${
            client?.company || client?.name || "client"
          }`,
        },
      ],
    });

    toast.success(
      status === "draft"
        ? "Draft saved"
        : "Invoice created",
    );

    navigate(`/invoices/${invoice.id}`);
  };

  const applyTerms = (term: PaymentTerm) => {
    setPaymentTerms(term);

    setDueDate(
      addDaysISO(
        issueDate,
        paymentTermDays(term),
      ),
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
        title="New invoice"
        description={`Invoice ${number} · totals update as you type.`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => save("draft")}
            >
              Save draft
            </Button>

            <Button
              onClick={() => {
                if (validate()) {
                  setConfirmOpen(true);
                }
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
              <CardTitle className="text-base">
                Invoice details
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="client"
                  className="text-sm font-medium"
                >
                  Client
                </label>

                <Select
                  value={clientId}
                  onValueChange={setClientId}
                >
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>

                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                      >
                        {c.company || c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.clientId ? (
                  <p className="text-sm text-destructive">
                    {errors.clientId}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="issue"
                  className="text-sm font-medium"
                >
                  Issue date
                </label>

                <Input
                  id="issue"
                  type="date"
                  value={issueDate}
                  onChange={(e) => {
                    const newIssueDate =
                      e.target.value;

                    setIssueDate(newIssueDate);

                    setDueDate(
                      addDaysISO(
                        newIssueDate,
                        paymentTermDays(
                          paymentTerms,
                        ),
                      ),
                    );
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="due"
                  className="text-sm font-medium"
                >
                  Due date
                </label>

                <Input
                  id="due"
                  type="date"
                  value={dueDate}
                  onChange={(e) =>
                    setDueDate(e.target.value)
                  }
                />

                {errors.dueDate ? (
                  <p className="text-sm text-destructive">
                    {errors.dueDate}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="terms"
                  className="text-sm font-medium"
                >
                  Payment terms
                </label>

                <Select
                  value={paymentTerms}
                  onValueChange={(value) =>
                    applyTerms(
                      value as PaymentTerm,
                    )
                  }
                >
                  <SelectTrigger id="terms">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {PAYMENT_TERMS.map((term) => (
                      <SelectItem
                        key={term.value}
                        value={term.value}
                      >
                        {term.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Line items
              </CardTitle>
            </CardHeader>

            <CardContent>
              <ItemsEditor
                items={items}
                products={products}
                onChange={setItems}
                error={errors.items}
              />

              <div className="ml-auto mt-6 w-full max-w-xs">
                <TotalsSummary items={items} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Notes & terms
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="notes"
                  className="text-sm font-medium"
                >
                  Notes for the client
                </label>

                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) =>
                    setNotes(e.target.value)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="tnc"
                  className="text-sm font-medium"
                >
                  Terms and conditions
                </label>

                <Textarea
                  id="tnc"
                  value={terms}
                  onChange={(e) =>
                    setTerms(e.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <InvoicePreview
            number={number}
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
        confirmLabel="Create invoice"
        onConfirm={() => {
          setConfirmOpen(false);
          save("pending");
        }}
      >
        <ul className="space-y-1 text-muted-foreground">
          <li>
            Client:{" "}
            <span className="text-foreground">
              {client?.company || client?.name}
            </span>
          </li>

          <li>
            Items:{" "}
            <span className="text-foreground">
              {items.length}
            </span>
          </li>

          <li>
            Total:{" "}
            <span className="font-semibold text-foreground">
              {formatIDR(totals.total)}
            </span>
          </li>
        </ul>
      </ConfirmationDialog>
    </>
  );
}
