export interface InvoiceSearch {
  search: string;
  status: string;
  client: string;
  from: string;
  to: string;
  sort: string;
  dir: string;
  page: number;
}

export const DEFAULT_INVOICE_SEARCH: InvoiceSearch = {
  search: "",
  status: "all",
  client: "all",
  from: "",
  to: "",
  sort: "issueDate",
  dir: "desc",
  page: 1,
};

export function parseInvoiceSearch(raw: Record<string, unknown>): InvoiceSearch {
  const str = (key: string, fallback = "") =>
    typeof raw[key] === "string" ? (raw[key] as string) : fallback;
  const page = Number(raw["page"]);
  return {
    search: str("search"),
    status: str("status", "all"),
    client: str("client", "all"),
    from: str("from"),
    to: str("to"),
    sort: str("sort", "issueDate"),
    dir: str("dir", "desc"),
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}