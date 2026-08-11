import { Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { CurrencyInput } from "~/components/common/controls";
import { formatDate, formatIDR, formatNumber } from "~/lib/format";
import { invoiceTotals, lineTotals, type Client, type InvoiceItem, type Product } from "~/data/types";
import { nextId } from "~/store/app-store";

export function emptyItem(): InvoiceItem {
  return {
    id: nextId("it"),
    productId: null,
    name: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    tax: 11,
  };
}

export function ItemsEditor({
  items,
  products,
  onChange,
  error,
}: {
  items: InvoiceItem[];
  products: Product[];
  onChange: (items: InvoiceItem[]) => void;
  error?: string | undefined;
}) {
  const patch = (id: string, next: Partial<InvoiceItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...next } : it)));

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Item {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove item ${index + 1}`}
                disabled={items.length === 1}
                onClick={() => onChange(items.filter((it) => it.id !== item.id))}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`prd-${item.id}`}>Product / service</Label>
                <Select
                  value={item.productId ?? "custom"}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      patch(item.id, { productId: null });
                      return;
                    }
                    const product = products.find((p) => p.id === value);
                    if (!product) return;
                    patch(item.id, {
                      productId: product.id,
                      name: product.name,
                      description: product.description,
                      unitPrice: product.price,
                      tax: product.tax,
                    });
                  }}
                >
                  <SelectTrigger id={`prd-${item.id}`}>
                    <SelectValue placeholder="Choose an item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom item</SelectItem>
                    {products
                      .filter((p) => p.status === "active")
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`name-${item.id}`}>Description</Label>
                <Input
                  id={`name-${item.id}`}
                  value={item.name}
                  placeholder="What are you billing for?"
                  onChange={(e) => patch(item.id, { name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`qty-${item.id}`}>Quantity</Label>
                  <Input
                    id={`qty-${item.id}`}
                    inputMode="decimal"
                    value={String(item.quantity)}
                    onChange={(e) =>
                      patch(item.id, { quantity: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`price-${item.id}`}>Unit price</Label>
                  <CurrencyInput
                    id={`price-${item.id}`}
                    value={item.unitPrice}
                    onChange={(v) => patch(item.id, { unitPrice: v })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`disc-${item.id}`}>Discount %</Label>
                  <Input
                    id={`disc-${item.id}`}
                    inputMode="decimal"
                    value={String(item.discount)}
                    onChange={(e) =>
                      patch(item.id, { discount: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`tax-${item.id}`}>Tax %</Label>
                  <Input
                    id={`tax-${item.id}`}
                    inputMode="decimal"
                    value={String(item.tax)}
                    onChange={(e) =>
                      patch(item.id, { tax: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })
                    }
                  />
                </div>
              </div>
            </div>

            <p className="mt-3 text-right text-sm text-muted-foreground">
              Line total:{" "}
              <span className="font-semibold text-foreground">
                {formatIDR(lineTotals(item).total)}
              </span>
            </p>
          </div>
        ))}
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <Button type="button" variant="outline" onClick={() => onChange([...items, emptyItem()])}>
        <Plus className="size-4" aria-hidden /> Add item
      </Button>
    </div>
  );
}

export function TotalsSummary({ items }: { items: InvoiceItem[] }) {
  const totals = invoiceTotals(items);
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="font-medium">{formatIDR(totals.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Discount</dt>
        <dd className="font-medium text-destructive">-{formatIDR(totals.discount)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Tax</dt>
        <dd className="font-medium">{formatIDR(totals.tax)}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-2 text-base">
        <dt className="font-semibold">Total</dt>
        <dd className="font-semibold">{formatIDR(totals.total)}</dd>
      </div>
    </dl>
  );
}

export function InvoicePreview({
  number,
  issueDate,
  dueDate,
  client,
  items,
  notes,
  terms,
  businessName,
  businessAddress,
}: {
  number: string;
  issueDate: string;
  dueDate: string;
  client?: Client | undefined;
  items: InvoiceItem[];
  notes?: string | undefined;
  terms?: string | undefined;
  businessName: string;
  businessAddress: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-foreground">{businessName}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{businessAddress}</p>
          </div>
          <div className="text-right">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Invoice</p>
            <p className="text-lg font-semibold text-foreground">{number || "—"}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Billed to
            </p>
            <p className="mt-1 font-medium text-foreground">
              {client ? client.company || client.name : "Select a client"}
            </p>
            {client ? (
              <p className="text-sm text-muted-foreground">
                {client.name}
                <br />
                {client.address}, {client.city}
                <br />
                {client.email}
              </p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-muted-foreground">
              Issue date: <span className="text-foreground">{formatDate(issueDate)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Due date: <span className="text-foreground">{formatDate(dueDate)}</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Price</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/60">
                  <td className="py-2 pr-2">{item.name || "Untitled item"}</td>
                  <td className="py-2 text-right">{formatNumber(item.quantity)}</td>
                  <td className="py-2 text-right">{formatIDR(item.unitPrice)}</td>
                  <td className="py-2 text-right font-medium">
                    {formatIDR(lineTotals(item).total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto w-full max-w-xs">
          <TotalsSummary items={items} />
        </div>

        {notes ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Notes
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{notes}</p>
          </div>
        ) : null}
        {terms ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Terms
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{terms}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}