import { useMemo, useState } from "react";
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
import { useAppStore } from "~/store/app-store";
import { categorySchema, productSchema } from "~/lib/validation";
import { formatIDR } from "~/lib/format";
import type { Category, Product } from "~/data/types";

export function meta() {
  return [
    {
      title: "Products & Services — Fakturia",
    },
    {
      name: "description",
      content:
        "Manage the products and services you bill, with prices, tax and categories.",
    },
    {
      property: "og:title",
      content: "Products & Services — Fakturia",
    },
    {
      property: "og:description",
      content:
        "Manage billable products, services and categories.",
    },
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
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    archiveProduct,
    addCategory,
    updateCategory,
    archiveCategory,
  } = useAppStore();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [productForm, setProductForm] =
    useState<ProductFormValues>({
      ...emptyProduct,
    });

  const [productErrors, setProductErrors] =
    useState<Record<string, string>>({});

  const [archiveTarget, setArchiveTarget] =
    useState<Product | null>(null);

  const [categoryOpen, setCategoryOpen] =
    useState(false);

  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  });

  const [categoryErrors, setCategoryErrors] =
    useState<Record<string, string>>({});

  const [categoryArchiveTarget, setCategoryArchiveTarget] =
    useState<Category | null>(null);

  const categoryName = (id: string) =>
    categories.find((category) => category.id === id)
      ?.name ?? "Uncategorised";

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return products.filter((product) => {
      if (
        typeFilter !== "all" &&
        product.type !== typeFilter
      ) {
        return false;
      }

      if (
        categoryFilter !== "all" &&
        product.categoryId !== categoryFilter
      ) {
        return false;
      }

      if (
        statusFilter !== "all" &&
        product.status !== statusFilter
      ) {
        return false;
      }

      if (
        term &&
        !`${product.name} ${product.description}`
          .toLowerCase()
          .includes(term)
      ) {
        return false;
      }

      return true;
    });
  }, [
    products,
    query,
    typeFilter,
    categoryFilter,
    statusFilter,
  ]);

  const openProduct = (
    product: Product | null
  ) => {
    setEditingProduct(product);
    setProductErrors({});

    setProductForm(
      product
        ? {
            name: product.name,
            type: product.type,
            description: product.description,
            price: product.price,
            unit: product.unit,
            tax: product.tax,
            categoryId: product.categoryId,
            status:
              product.status === "archived"
                ? "active"
                : product.status,
          }
        : {
            ...emptyProduct,
            categoryId:
              categories[0]?.id ?? "",
          }
    );

    setProductOpen(true);
  };

  const submitProduct = () => {
    const result =
      productSchema.safeParse(productForm);

    if (!result.success) {
      const errors: Record<string, string> = {};

      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);

        if (!errors[key]) {
          errors[key] = issue.message;
        }
      }

      setProductErrors(errors);
      return;
    }

    const productData = {
      ...result.data,
      description:
        result.data.description ?? "",
    };

    if (editingProduct) {
      updateProduct(
        editingProduct.id,
        productData
      );

      toast.success("Product updated");
    } else {
      addProduct(productData);

      toast.success("Product created");
    }

    setProductOpen(false);
  };

  const openCategory = (
    category: Category | null
  ) => {
    setEditingCategory(category);
    setCategoryErrors({});

    setCategoryForm(
      category
        ? {
            name: category.name,
            description:
              category.description,
          }
        : {
            name: "",
            description: "",
          }
    );

    setCategoryOpen(true);
  };

  const submitCategory = () => {
    const result = categorySchema.safeParse({
      ...categoryForm,
      status: "active",
    });

    if (!result.success) {
      const errors: Record<string, string> = {};

      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);

        if (!errors[key]) {
          errors[key] = issue.message;
        }
      }

      setCategoryErrors(errors);
      return;
    }

    const categoryData = {
      ...result.data,
      description:
        result.data.description ?? "",
    };

    if (editingCategory) {
      updateCategory(
        editingCategory.id,
        categoryData
      );

      toast.success("Category updated");
    } else {
      addCategory(categoryData);

      toast.success("Category created");
    }

    setCategoryOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Products & Services"
        description="Everything you can add as a line item on an invoice."
        actions={
          <Button
            onClick={() => openProduct(null)}
          >
            <Plus
              className="size-4"
              aria-hidden="true"
            />
            Add item
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search products and services..."
          />

          <Select
            value={typeFilter}
            onValueChange={setTypeFilter}
          >
            <SelectTrigger aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                All types
              </SelectItem>

              <SelectItem value="product">
                Products
              </SelectItem>

              <SelectItem value="service">
                Services
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                All categories
              </SelectItem>

              {categories.map((category) => (
                <SelectItem
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                All statuses
              </SelectItem>

              <SelectItem value="active">
                Active
              </SelectItem>

              <SelectItem value="inactive">
                Inactive
              </SelectItem>

              <SelectItem value="archived">
                Archived
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No items found"
              description="Add a product or service so you can reuse it on invoices."
              action={
                <Button
                  onClick={() =>
                    openProduct(null)
                  }
                >
                  Add item
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Name
                    </TableHead>

                    <TableHead className="hidden md:table-cell">
                      Type
                    </TableHead>

                    <TableHead className="hidden md:table-cell">
                      Category
                    </TableHead>

                    <TableHead className="text-right">
                      Price
                    </TableHead>

                    <TableHead className="hidden text-right sm:table-cell">
                      Tax
                    </TableHead>

                    <TableHead>
                      Status
                    </TableHead>

                    <TableHead className="w-12 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">
                          {product.name}
                        </p>

                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {product.description}
                        </p>
                      </TableCell>

                      <TableCell className="hidden capitalize md:table-cell">
                        {product.type}
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        {categoryName(
                          product.categoryId
                        )}
                      </TableCell>

                      <TableCell className="text-right font-medium">
                        {formatIDR(
                          product.price
                        )}

                        <span className="text-xs text-muted-foreground">
                          {" "}
                          / {product.unit}
                        </span>
                      </TableCell>

                      <TableCell className="hidden text-right sm:table-cell">
                        {product.tax}%
                      </TableCell>

                      <TableCell>
                        <StatusBadge
                          status={
                            product.status
                          }
                        />
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${product.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() =>
                                openProduct(
                                  product
                                )
                              }
                            >
                              Edit
                            </DropdownMenuItem>

                            {product.status !==
                            "archived" ? (
                              <DropdownMenuItem
                                onSelect={() => {
                                  updateProduct(
                                    product.id,
                                    {
                                      status:
                                        product.status ===
                                        "active"
                                          ? "inactive"
                                          : "active",
                                    }
                                  );

                                  toast.success(
                                    product.status ===
                                      "active"
                                      ? "Item deactivated"
                                      : "Item activated"
                                  );
                                }}
                              >
                                {product.status ===
                                "active"
                                  ? "Deactivate"
                                  : "Activate"}
                              </DropdownMenuItem>
                            ) : null}

                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() =>
                                setArchiveTarget(
                                  product
                                )
                              }
                            >
                              Archive
                            </DropdownMenuItem>
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
          <CardTitle className="text-base">
            Categories
          </CardTitle>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              openCategory(null)
            }
          >
            <Plus
              className="size-4"
              aria-hidden="true"
            />
            New category
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {categories.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No categories"
              description="Group your products and services with categories."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Name
                    </TableHead>

                    <TableHead className="hidden sm:table-cell">
                      Description
                    </TableHead>

                    <TableHead className="text-right">
                      Items
                    </TableHead>

                    <TableHead>
                      Status
                    </TableHead>

                    <TableHead className="w-12 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {categories.map((category) => (
                    <TableRow
                      key={category.id}
                    >
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>

                      <TableCell className="hidden max-w-sm truncate sm:table-cell">
                        {category.description}
                      </TableCell>

                      <TableCell className="text-right">
                        {
                          products.filter(
                            (product) =>
                              product.categoryId ===
                              category.id
                          ).length
                        }
                      </TableCell>

                      <TableCell>
                        <StatusBadge
                          status={
                            category.status
                          }
                        />
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${category.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() =>
                                openCategory(
                                  category
                                )
                              }
                            >
                              Edit
                            </DropdownMenuItem>

                            {category.status ===
                            "active" ? (
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() =>
                                  setCategoryArchiveTarget(
                                    category
                                  )
                                }
                              >
                                Archive
                              </DropdownMenuItem>
                            ) : null}
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

      <Dialog
        open={productOpen}
        onOpenChange={setProductOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct
                ? "Edit item"
                : "Add item"}
            </DialogTitle>

            <DialogDescription>
              Products and services can be reused as invoice line items.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-name">
                Name
              </Label>

              <Input
                id="p-name"
                value={productForm.name}
                onChange={(event) =>
                  setProductForm((form) => ({
                    ...form,
                    name: event.target.value,
                  }))
                }
              />

              {productErrors.name ? (
                <p className="text-sm text-destructive">
                  {productErrors.name}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-desc">
                Description
              </Label>

              <Textarea
                id="p-desc"
                value={
                  productForm.description
                }
                onChange={(event) =>
                  setProductForm((form) => ({
                    ...form,
                    description:
                      event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-type">
                Type
              </Label>

              <Select
                value={productForm.type}
                onValueChange={(value) =>
                  setProductForm((form) => ({
                    ...form,
                    type:
                      value as
                        | "product"
                        | "service",
                  }))
                }
              >
                <SelectTrigger id="p-type">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="product">
                    Product
                  </SelectItem>

                  <SelectItem value="service">
                    Service
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-cat">
                Category
              </Label>

              <Select
                value={
                  productForm.categoryId
                }
                onValueChange={(value) =>
                  setProductForm((form) => ({
                    ...form,
                    categoryId: value,
                  }))
                }
              >
                <SelectTrigger id="p-cat">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>

                <SelectContent>
                  {categories
                    .filter(
                      (category) =>
                        category.status ===
                        "active"
                    )
                    .map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {productErrors.categoryId ? (
                <p className="text-sm text-destructive">
                  {productErrors.categoryId}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-price">
                Price
              </Label>

              <CurrencyInput
                id="p-price"
                value={productForm.price}
                onChange={(value) =>
                  setProductForm((form) => ({
                    ...form,
                    price: value,
                  }))
                }
              />

              {productErrors.price ? (
                <p className="text-sm text-destructive">
                  {productErrors.price}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-unit">
                Unit
              </Label>

              <Input
                id="p-unit"
                value={productForm.unit}
                onChange={(event) =>
                  setProductForm((form) => ({
                    ...form,
                    unit: event.target.value,
                  }))
                }
              />

              {productErrors.unit ? (
                <p className="text-sm text-destructive">
                  {productErrors.unit}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-tax">
                Tax %
              </Label>

              <Input
                id="p-tax"
                inputMode="decimal"
                value={String(
                  productForm.tax
                )}
                onChange={(event) =>
                  setProductForm((form) => ({
                    ...form,
                    tax:
                      Number(
                        event.target.value.replace(
                          /[^\d.]/g,
                          ""
                        )
                      ) || 0,
                  }))
                }
              />

              {productErrors.tax ? (
                <p className="text-sm text-destructive">
                  {productErrors.tax}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-status">
                Status
              </Label>

              <Select
                value={
                  productForm.status
                }
                onValueChange={(value) =>
                  setProductForm((form) => ({
                    ...form,
                    status:
                      value as
                        | "active"
                        | "inactive",
                  }))
                }
              >
                <SelectTrigger id="p-status">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="active">
                    Active
                  </SelectItem>

                  <SelectItem value="inactive">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setProductOpen(false)
              }
            >
              Cancel
            </Button>

            <Button
              onClick={submitProduct}
            >
              {editingProduct
                ? "Save changes"
                : "Create item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? "Edit category"
                : "New category"}
            </DialogTitle>

            <DialogDescription>
              Categories help you organise your catalogue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">
                Name
              </Label>

              <Input
                id="c-name"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((form) => ({
                    ...form,
                    name: event.target.value,
                  }))
                }
              />

              {categoryErrors.name ? (
                <p className="text-sm text-destructive">
                  {categoryErrors.name}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-desc">
                Description
              </Label>

              <Textarea
                id="c-desc"
                value={
                  categoryForm.description
                }
                onChange={(event) =>
                  setCategoryForm((form) => ({
                    ...form,
                    description:
                      event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCategoryOpen(false)
              }
            >
              Cancel
            </Button>

            <Button
              onClick={submitCategory}
            >
              {editingCategory
                ? "Save changes"
                : "Create category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
          }
        }}
        title="Archive this item?"
        description={`${
          archiveTarget?.name ?? ""
        } will be hidden from new invoices. Existing invoices keep their data.`}
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          if (archiveTarget) {
            archiveProduct(
              archiveTarget.id
            );

            toast.success(
              "Item archived"
            );
          }

          setArchiveTarget(null);
        }}
      />

      <ConfirmationDialog
        open={
          categoryArchiveTarget !== null
        }
        onOpenChange={(open) => {
          if (!open) {
            setCategoryArchiveTarget(null);
          }
        }}
        title="Archive this category?"
        description={`${
          categoryArchiveTarget?.name ?? ""
        } will no longer be selectable for new items.`}
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          if (categoryArchiveTarget) {
            archiveCategory(
              categoryArchiveTarget.id
            );

            toast.success(
              "Category archived"
            );
          }

          setCategoryArchiveTarget(null);
        }}
      />
    </>
  );
}