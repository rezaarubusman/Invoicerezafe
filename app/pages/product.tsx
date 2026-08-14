import { useEffect, useMemo, useState } from "react";
import { Layers, MoreHorizontal, Package, Plus, LayoutGrid, List as ListIcon, Settings2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Checkbox } from "~/components/ui/checkbox";
import { EmptyState, PageHeader } from "~/components/common/page-parts";
import { ConfirmationDialog, CurrencyInput } from "~/components/common/controls";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTarget, setSettingsTarget] = useState<"products" | "categories">("products");

  const itemsPerPage = 8;
  const [prodPage, setProdPage] = useState(1);
  const [catPage, setCatPage] = useState(1);
  const [prodSearch, setProdSearch] = useState("");
  const [catSearch, setCatSearch] = useState("");
  const [debouncedProdSearch, setDebouncedProdSearch] = useState("");
  const [debouncedCatSearch, setDebouncedCatSearch] = useState("");

  const [prodSortBy, setProdSortBy] = useState("createdAt");
  const [prodTypeFilter, setProdTypeFilter] = useState("all");
  
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProdSearch(prodSearch);
      
      const currentParams = Object.fromEntries(searchParams.entries());
      if (prodSearch.trim()) {
        setSearchParams({ ...currentParams, search: prodSearch, page: "1" });
      } else {
        delete currentParams.search;
        setSearchParams(currentParams);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [prodSearch, setSearchParams, searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedProdSearch(prodSearch), 500);
    return () => clearTimeout(timer);
  }, [prodSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCatSearch(catSearch), 500);
    return () => clearTimeout(timer);
  }, [catSearch]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        axiosInstance.get("/product", { params: { search: debouncedProdSearch, limit: 100 } }),
        axiosInstance.get("/category", { params: { search: debouncedCatSearch, limit: 100 } }),
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
  }, [debouncedProdSearch, debouncedCatSearch]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Uncategorised";

  const processedProducts = useMemo(() => {
    let result = [...products];
    const term = debouncedProdSearch.toLowerCase();
    
    if (term) result = result.filter(p => `${p.name} ${p.description}`.toLowerCase().includes(term));
    if (prodTypeFilter !== "all") result = result.filter(p => p.type === prodTypeFilter);
    
    if (prodSortBy === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    else if (prodSortBy === "price") result.sort((a, b) => b.price - a.price);
    else result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); 

    return result;
  }, [products, debouncedProdSearch, prodTypeFilter, prodSortBy]);

  const paginatedProducts = processedProducts.slice((prodPage - 1) * itemsPerPage, prodPage * itemsPerPage);
  const totalProdPages = Math.ceil(processedProducts.length / itemsPerPage);

  const processedCategories = useMemo(() => {
    let result = [...categories];
    const term = debouncedCatSearch.toLowerCase();
    if (term) result = result.filter(c => `${c.name} ${c.description}`.toLowerCase().includes(term));
    return result;
  }, [categories, debouncedCatSearch]);

  const paginatedCategories = processedCategories.slice((catPage - 1) * itemsPerPage, catPage * itemsPerPage);
  const totalCatPages = Math.ceil(processedCategories.length / itemsPerPage);

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
            categoryId: product.categoryId || "", // Handle null to empty string for form
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
      const productData: any = { ...result.data, description: result.data.description ?? "" };
      
      if (productData.categoryId === "") {
        if (editingProduct) {
          productData.categoryId = null; 
        } else {
          delete productData.categoryId; 
        }
      }

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

  const openSettings = (target: "products" | "categories") => {
    setSettingsTarget(target);
    setSettingsOpen(true);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground flex justify-center items-center h-[50vh]">Loading...</div>;
  }

  return (
    <div className="space-y-12 pb-12">
      <section className="space-y-6">
        <PageHeader
          title="Products & Services"
          description="Everything you can add as a line item on an invoice."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")} aria-label="Toggle View">
                {viewMode === "list" ? <LayoutGrid className="size-4" /> : <ListIcon className="size-4" />}
              </Button>
              <Button onClick={() => openProduct(null)} className="rounded-xl">
                <Plus className="size-4 mr-2" aria-hidden="true" /> Add item
              </Button>
            </div>
          }
        />

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              className="pl-9 rounded-full bg-background border-border shadow-sm focus-visible:ring-primary" 
              placeholder="Search products..." 
              value={prodSearch}
              onChange={(e) => {
                setProdSearch(e.target.value);
                setProdPage(1);
              }}
            />
          </div>
          <Button variant="outline" className="rounded-full shadow-sm w-full sm:w-auto" onClick={() => openSettings("products")}>
            <Settings2 className="size-4 mr-2" /> Sort & Filter
          </Button>
        </div>

        {processedProducts.length === 0 ? (
          <EmptyState icon={Package} title="No items found" description="Add a product or service so you can reuse it on invoices." action={<Button onClick={() => openProduct(null)}>Add item</Button>} />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedProducts.map((product) => (
              <Card key={product.id} className="rounded-3xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full bg-card">
                <CardHeader className="text-center pb-3">
                  <CardTitle className="text-xl font-bold text-foreground break-words">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-2 text-sm text-muted-foreground h-10">{product.description || "-"}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 grid gap-3 flex-grow text-sm px-6">
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-muted-foreground">Type</span>
                    <span className="capitalize font-medium text-foreground">{product.type}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium truncate max-w-[120px] text-foreground">
                      {categoryName(product.categoryId ?? "")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-bold text-primary">{formatIDR(product.price)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium text-foreground">{product.tax}%</span>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <StatusBadge status={product.status} />
                  </div>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-3 p-4 bg-muted/20 border-t border-border/50">
                  <Button variant="outline" className="rounded-2xl w-full bg-background hover:bg-muted" onClick={() => openProduct(product)}>Edit</Button>
                  <Button variant="outline" className="rounded-2xl w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setArchiveTarget(product)}>Archive</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-sm rounded-3xl overflow-hidden border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Tax</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-12 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <p className="font-bold text-foreground">{product.name}</p>
                        <p className="max-w-xs truncate text-xs text-muted-foreground">{product.description}</p>
                      </TableCell>
                      <TableCell className="hidden capitalize md:table-cell font-medium">{product.type}</TableCell>
                      <TableCell className="hidden md:table-cell font-medium">{categoryName(product.categoryId ?? "")}</TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatIDR(product.price)} <span className="text-xs text-muted-foreground font-normal">/{product.unit}</span>
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">{product.tax}%</TableCell>
                      <TableCell className="text-center"><StatusBadge status={product.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
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
          </Card>
        )}

        {totalProdPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button variant="outline" size="icon" className="rounded-full shadow-sm" disabled={prodPage <= 1} onClick={() => setProdPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-bold text-foreground bg-muted px-4 py-2 rounded-full">
              Page {prodPage} of {totalProdPages}
            </span>
            <Button variant="outline" size="icon" className="rounded-full shadow-sm" disabled={prodPage >= totalProdPages} onClick={() => setProdPage(p => Math.min(totalProdPages, p + 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </section>

      <hr className="border-border border-t-2 border-dashed my-8" />
      <section className="space-y-6">
        <PageHeader
          title="Categories"
          description="Group your products and services with categories."
          actions={
            <Button onClick={() => openCategory(null)} className="rounded-xl">
              <Plus className="size-4 mr-2" aria-hidden="true" /> Add Category
            </Button>
          }
        />

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              className="pl-9 rounded-full bg-background border-border shadow-sm focus-visible:ring-primary" 
              placeholder="Search categories..." 
              value={catSearch}
              onChange={(e) => {
                setCatSearch(e.target.value);
                setCatPage(1);
              }}
            />
          </div>
          <Button variant="outline" className="rounded-full shadow-sm w-full sm:w-auto" onClick={() => openSettings("categories")}>
            <Settings2 className="size-4 mr-2" /> Sort
          </Button>
        </div>

        {processedCategories.length === 0 ? (
          <EmptyState icon={Layers} title="No categories found" description="Create a category to organize your catalogue." action={<Button onClick={() => openCategory(null)}>Add Category</Button>} />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedCategories.map((category) => (
              <Card key={category.id} className="rounded-3xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full bg-card">
                <CardHeader className="text-center pb-2 bg-muted/10">
                  <CardTitle className="text-xl font-bold text-foreground line-clamp-1">{category.name}</CardTitle>
                  <CardDescription className="line-clamp-2 text-sm text-muted-foreground h-10">{category.description || "No description"}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 grid gap-4 flex-grow text-sm px-6 text-center">
                  <div>
                    <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-1">Total Items</p>
                    <p className="text-4xl font-extrabold text-primary">
                      {products.filter((p) => p.categoryId === category.id).length}
                    </p>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <StatusBadge status={category.status} />
                  </div>
                </CardContent>
                <CardFooter className="p-4 bg-muted/20 border-t border-border/50">
                  <Button variant="outline" className="rounded-2xl w-full bg-background hover:bg-muted" onClick={() => openCategory(category)}>Edit Category</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-sm rounded-3xl overflow-hidden border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-12 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-bold">{category.name}</TableCell>
                      <TableCell className="hidden max-w-sm truncate sm:table-cell text-muted-foreground">{category.description}</TableCell>
                      <TableCell className="text-center font-bold text-lg text-primary">{products.filter((p) => p.categoryId === category.id).length}</TableCell>
                      <TableCell className="text-center"><StatusBadge status={category.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
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
          </Card>
        )}

        {totalCatPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button variant="outline" size="icon" className="rounded-full shadow-sm" disabled={catPage <= 1} onClick={() => setCatPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-bold text-foreground bg-muted px-4 py-2 rounded-full">
              Page {catPage} of {totalCatPages}
            </span>
            <Button variant="outline" size="icon" className="rounded-full shadow-sm" disabled={catPage >= totalCatPages} onClick={() => setCatPage(p => Math.min(totalCatPages, p + 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </section>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Settings2 className="size-5 text-primary" /> 
              {settingsTarget === "products" ? "Product List Settings" : "Category List Settings"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8 py-4">
            <div className="space-y-4">
              <Label className="text-xs font-bold tracking-widest text-primary uppercase flex items-center gap-2">
                <ListIcon className="size-3" /> SORTING & PRIMARY METRIC
              </Label>
              <p className="text-sm text-muted-foreground">Determines sorting order and highlighted metric.</p>
              
              <Select value={settingsTarget === "products" ? prodSortBy : "createdAt"} onValueChange={(val) => {
                if (settingsTarget === "products") setProdSortBy(val);
              }}>
                <SelectTrigger className="w-full rounded-xl h-12 bg-background">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="createdAt">Date Added (Newest)</SelectItem>
                  <SelectItem value="name">Name (A - Z)</SelectItem>
                  {settingsTarget === "products" && (
                    <SelectItem value="price">Price (High to Low)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {settingsTarget === "products" && (
              <div className="space-y-4">
                <Label className="text-xs font-bold tracking-widest text-primary uppercase flex items-center gap-2">
                  <LayoutGrid className="size-3" /> VISIBLE COLUMNS & TYPE
                </Label>
                <p className="text-sm text-muted-foreground">Select which metrics to display for each item.</p>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="type-all" className="rounded-sm"
                      checked={prodTypeFilter === "all"} onCheckedChange={() => setProdTypeFilter("all")} />
                    <label htmlFor="type-all" className="text-sm font-medium leading-none text-foreground cursor-pointer">All Types</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="type-product" className="rounded-sm"
                      checked={prodTypeFilter === "product"} onCheckedChange={() => setProdTypeFilter("product")} />
                    <label htmlFor="type-product" className="text-sm font-medium leading-none text-foreground cursor-pointer">Products Only</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="type-service" className="rounded-sm"
                      checked={prodTypeFilter === "service"} onCheckedChange={() => setProdTypeFilter("service")} />
                    <label htmlFor="type-service" className="text-sm font-medium leading-none text-foreground cursor-pointer">Services Only</label>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="border-t pt-4 flex justify-end gap-3 sm:justify-end">
            <Button variant="outline" onClick={() => setSettingsOpen(false)} className="rounded-xl font-medium">
              Cancel
            </Button>
            <Button onClick={() => setSettingsOpen(false)} className="rounded-xl font-bold px-6 shadow-md">
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={productOpen} onOpenChange={setProductOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit item" : "Add item"}</DialogTitle>
            <DialogDescription>Products and services can be reused as invoice line items.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 sm:grid-cols-2 py-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" className="rounded-xl" value={productForm.name} onChange={(event) => setProductForm((form) => ({ ...form, name: event.target.value }))} />
              {productErrors.name && <p className="text-sm text-destructive font-medium">{productErrors.name}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" className="rounded-xl min-h-[100px]" value={productForm.description} onChange={(event) => setProductForm((form) => ({ ...form, description: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-type">Type</Label>
              <Select value={productForm.type} onValueChange={(value) => setProductForm((form) => ({ ...form, type: value as "product" | "service" }))}>
                <SelectTrigger id="p-type" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-cat">Category</Label>
              <Select value={productForm.categoryId} onValueChange={(value) => setProductForm((form) => ({ ...form, categoryId: value }))}>
                <SelectTrigger id="p-cat" className="rounded-xl"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="">-- No Category --</SelectItem>
                  {categories.filter((category) => category.status === "active").map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {productErrors.categoryId && <p className="text-sm text-destructive font-medium">{productErrors.categoryId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-price">Price</Label>
              <CurrencyInput id="p-price" className="rounded-xl" value={productForm.price} onChange={(value) => setProductForm((form) => ({ ...form, price: value }))} />
              {productErrors.price && <p className="text-sm text-destructive font-medium">{productErrors.price}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-unit">Unit</Label>
              <Input id="p-unit" className="rounded-xl" value={productForm.unit} onChange={(event) => setProductForm((form) => ({ ...form, unit: event.target.value }))} />
              {productErrors.unit && <p className="text-sm text-destructive font-medium">{productErrors.unit}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-tax">Tax %</Label>
              <Input id="p-tax" className="rounded-xl" inputMode="decimal" value={String(productForm.tax)} onChange={(event) => setProductForm((form) => ({ ...form, tax: Number(event.target.value.replace(/[^\d.]/g, "")) || 0 }))} />
              {productErrors.tax && <p className="text-sm text-destructive font-medium">{productErrors.tax}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-status">Status</Label>
              <Select value={productForm.status} onValueChange={(value) => setProductForm((form) => ({ ...form, status: value as "active" | "inactive" }))}>
                <SelectTrigger id="p-status" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setProductOpen(false)}>Cancel</Button>
            <Button onClick={submitProduct} className="rounded-xl">{editingProduct ? "Save changes" : "Create item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>Categories help you organise your catalogue.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" className="rounded-xl" value={categoryForm.name} onChange={(event) => setCategoryForm((form) => ({ ...form, name: event.target.value }))} />
              {categoryErrors.name && <p className="text-sm text-destructive font-medium">{categoryErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-desc">Description</Label>
              <Textarea id="c-desc" className="rounded-xl min-h-[120px]" value={categoryForm.description} onChange={(event) => setCategoryForm((form) => ({ ...form, description: event.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCategoryOpen(false)}>Cancel</Button>
            <Button onClick={submitCategory} className="rounded-xl">{editingCategory ? "Save changes" : "Create category"}</Button>
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
    </div>
  );
}