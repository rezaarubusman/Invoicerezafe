import { useEffect, useMemo, useState } from "react";
import { Layers, MoreHorizontal, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { EmptyState, PageHeader } from "~/components/common/page-parts";
import { ConfirmationDialog, CurrencyInput, SearchInput } from "~/components/common/controls";
import { StatusBadge } from "~/components/common/status-badges";
import { categorySchema, productSchema } from "~/lib/validation";
import { formatIDR } from "~/lib/format";
import type { Category, Product } from "~/data/types";
import { axiosInstance } from "~/lib/axios";

export function meta() {
  return [
    { title: "Products & Services — Fakturia" },
    { name: "description", content: "Manage the products and services you bill, with prices, tax and categories." },
  ];
}

type ProductFormValues = {
  name: string;
  type: "product" | "service";
  description: string;
  price: number;
  unit: string;
  tax: number;
  categoryId: string;
  status: "active" | "inactive";
};

const emptyProduct: ProductFormValues = {
  name: "",
  type: "service",
  description: "",
  price: 0,
  unit: "pcs",
  tax: 11,
  categoryId: "",
  status: "active",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormValues>({ ...emptyProduct });
  const [productErrors, setProductErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [categoryErrors, setCategoryErrors] = useState<Record<string, string>>({});
  const [categoryArchiveTarget, setCategoryArchiveTarget] = useState<Category | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        axiosInstance.get("/product"),
        axiosInstance.get("/category"),
      ]);
      
      const normalizedProducts = prodRes.data.data.map((p: any) => ({
        ...p,
        type: p.type?.toLowerCase() || "service",
        status: p.status?.toLowerCase() || "active",
        price: Number(p.price),
        tax: Number(p.tax),
      }));

      const normalizedCategories = catRes.data.data.map((c: any) => ({
        ...c,
        status: c.status?.toLowerCase() || "active",
      }));

      setProducts(normalizedProducts);
      setCategories(normalizedCategories);
    } catch (error) {
      toast.error("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Uncategorised";

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      if (typeFilter !== "all" && product.type !== typeFilter) return false;
      if (categoryFilter !== "all" && product.categoryId !== categoryFilter) return false;
      if (statusFilter !== "all" && product.status !== statusFilter) return false;
      if (term && !`${product.name} ${product.description}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [products, query, typeFilter, categoryFilter, statusFilter]);

  const openProduct = (product: Product | null) => {
    setEditingProduct(product);
    setProductErrors({});
    setProductForm(
      product
        ? {
            name: product.name,
            type: product.type,
            description: product.description || "",
            price: product.price,
            unit: product.unit,
            tax: product.tax,
            categoryId: product.categoryId,
            status: product.status === "archived" ? "active" : product.status as "active" | "inactive",
          }
        : { ...emptyProduct, categoryId: categories.find(c => c.status === "active")?.id ?? "" }
    );
    setProductOpen(true);
  };

  const submitProduct = async () => {
    const result = productSchema.safeParse(productForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[String(issue.path[0])] = issue.message;
      setProductErrors(errors);
      return;
    }

    try {
      const productData = { ...result.data, description: result.data.description ?? "" };
      
      if (editingProduct) {
        await axiosInstance.patch(`/product/${editingProduct.id}`, productData);
        toast.success("Product updated successfully");
      } else {
        await axiosInstance.post("/product", productData);
        toast.success("Product created successfully");
      }
      
      fetchData();
      setProductOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  const openCategory = (category: Category | null) => {
    setEditingCategory(category);
    setCategoryErrors({});
    setCategoryForm(category ? { name: category.name, description: category.description || "" } : { name: "", description: "" });
    setCategoryOpen(true);
  };

  const submitCategory = async () => {
    const result = categorySchema.safeParse({ ...categoryForm, status: "active" });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[String(issue.path[0])] = issue.message;
      setCategoryErrors(errors);
      return;
    }

    try {
      const categoryData = { ...result.data, description: result.data.description ?? "" };
      
      if (editingCategory) {
        await axiosInstance.patch(`/category/${editingCategory.id}`, categoryData);
        toast.success("Category updated");
      } else {
        await axiosInstance.post("/category", categoryData);
        toast.success("Category created");
      }

      fetchData();
      setCategoryOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  const toggleProductStatus = async (product: Product) => {
    const newStatus = product.status === "active" ? "inactive" : "active";
    try {
      await axiosInstance.patch(`/product/${product.id}`, { status: newStatus });
      toast.success(newStatus === "active" ? "Item activated" : "Item deactivated");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const handleArchiveProduct = async () => {
    if (!archiveTarget) return;
    try {
      await axiosInstance.delete(`/product/${archiveTarget.id}`);
      toast.success("Item archived");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to archive item");
    } finally {
      setArchiveTarget(null);
    }
  };

  const handleArchiveCategory = async () => {
    if (!categoryArchiveTarget) return;
    try {
      await axiosInstance.delete(`/category/${categoryArchiveTarget.id}`);
      toast.success("Category archived");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to archive category");
    } finally {
      setCategoryArchiveTarget(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground flex justify-center items-center h-[50vh]">Loading products & services...</div>;
  }

  return (
    <>
      <PageHeader
        title="Products & Services"
        description="Everything you can add as a line item on an invoice."
        actions={<Button onClick={() => openProduct(null)}><Plus className="size-4 mr-2" aria-hidden="true" /> Add item</Button>}
      />

      <Card className="shadow-sm mb-6">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <SearchInput value={query} onChange={setQuery} placeholder="Search products and services..." />

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger aria-label="Filter by type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="product">Products</SelectItem>
              <SelectItem value="service">Services</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger aria-label="Filter by category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="shadow-sm mb-6">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Package} title="No items found" description="Add a product or service so you can reuse it on invoices." action={<Button onClick={() => openProduct(null)}>Add item</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Tax</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="max-w-xs truncate text-xs text-muted-foreground">{product.description}</p>
                      </TableCell>
                      <TableCell className="hidden capitalize md:table-cell">{product.type}</TableCell>
                      <TableCell className="hidden md:table-cell">{categoryName(product.categoryId)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatIDR(product.price)}
                        <span className="text-xs text-muted-foreground"> / {product.unit}</span>
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">{product.tax}%</TableCell>
                      <TableCell><StatusBadge status={product.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${product.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openProduct(product)}>Edit</DropdownMenuItem>
                            {product.status !== "archived" && (
                              <DropdownMenuItem onSelect={() => toggleProductStatus(product)}>
                                {product.status === "active" ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onSelect={() => setArchiveTarget(product)}>Archive</DropdownMenuItem>
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

      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Categories</CardTitle>
          <Button variant="outline" size="sm" onClick={() => openCategory(null)}><Plus className="size-4 mr-2" aria-hidden="true" />New category</Button>
        </CardHeader>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <EmptyState icon={Layers} title="No categories" description="Group your products and services with categories." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="hidden max-w-sm truncate sm:table-cell">{category.description}</TableCell>
                      <TableCell className="text-right">{products.filter((p) => p.categoryId === category.id).length}</TableCell>
                      <TableCell><StatusBadge status={category.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${category.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openCategory(category)}>Edit</DropdownMenuItem>
                            {category.status === "active" && (
                              <DropdownMenuItem className="text-destructive" onSelect={() => setCategoryArchiveTarget(category)}>Archive</DropdownMenuItem>
                            )}
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

      <Dialog open={productOpen} onOpenChange={setProductOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit item" : "Add item"}</DialogTitle>
            <DialogDescription>Products and services can be reused as invoice line items.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={productForm.name} onChange={(event) => setProductForm((form) => ({ ...form, name: event.target.value }))} />
              {productErrors.name && <p className="text-sm text-destructive">{productErrors.name}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" value={productForm.description} onChange={(event) => setProductForm((form) => ({ ...form, description: event.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-type">Type</Label>
              <Select value={productForm.type} onValueChange={(value) => setProductForm((form) => ({ ...form, type: value as "product" | "service" }))}>
                <SelectTrigger id="p-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-cat">Category</Label>
              <Select value={productForm.categoryId} onValueChange={(value) => setProductForm((form) => ({ ...form, categoryId: value }))}>
                <SelectTrigger id="p-cat"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories.filter((category) => category.status === "active").map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {productErrors.categoryId && <p className="text-sm text-destructive">{productErrors.categoryId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-price">Price</Label>
              <CurrencyInput id="p-price" value={productForm.price} onChange={(value) => setProductForm((form) => ({ ...form, price: value }))} />
              {productErrors.price && <p className="text-sm text-destructive">{productErrors.price}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-unit">Unit</Label>
              <Input id="p-unit" value={productForm.unit} onChange={(event) => setProductForm((form) => ({ ...form, unit: event.target.value }))} />
              {productErrors.unit && <p className="text-sm text-destructive">{productErrors.unit}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-tax">Tax %</Label>
              <Input id="p-tax" inputMode="decimal" value={String(productForm.tax)} onChange={(event) => setProductForm((form) => ({ ...form, tax: Number(event.target.value.replace(/[^\d.]/g, "")) || 0 }))} />
              {productErrors.tax && <p className="text-sm text-destructive">{productErrors.tax}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-status">Status</Label>
              <Select value={productForm.status} onValueChange={(value) => setProductForm((form) => ({ ...form, status: value as "active" | "inactive" }))}>
                <SelectTrigger id="p-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProductOpen(false)}>Cancel</Button>
            <Button onClick={submitProduct}>{editingProduct ? "Save changes" : "Create item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>Categories help you organise your catalogue.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" value={categoryForm.name} onChange={(event) => setCategoryForm((form) => ({ ...form, name: event.target.value }))} />
              {categoryErrors.name && <p className="text-sm text-destructive">{categoryErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Description</Label>
              <Textarea id="c-desc" value={categoryForm.description} onChange={(event) => setCategoryForm((form) => ({ ...form, description: event.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryOpen(false)}>Cancel</Button>
            <Button onClick={submitCategory}>{editingCategory ? "Save changes" : "Create category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive this item?"
        description={`${archiveTarget?.name ?? ""} will be hidden from new invoices. Existing invoices keep their data.`}
        confirmLabel="Archive"
        destructive
        onConfirm={handleArchiveProduct}
      />

      <ConfirmationDialog
        open={categoryArchiveTarget !== null}
        onOpenChange={(open) => !open && setCategoryArchiveTarget(null)}
        title="Archive this category?"
        description={`${categoryArchiveTarget?.name ?? ""} will no longer be selectable for new items.`}
        confirmLabel="Archive"
        destructive
        onConfirm={handleArchiveCategory}
      />
    </>
  );
}