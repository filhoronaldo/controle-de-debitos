
import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProductList } from "@/components/ProductList";
import { CreateProductDialog } from "@/components/CreateProductDialog";
import { ProductFilters, ProductFilters as ProductFiltersType } from "@/components/ProductFilters";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/product";

export default function Products() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ProductFiltersType>({
    search: '',
    category: '',
    stockStatus: 'all',
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lblz_products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const categories = useMemo(() => {
    if (!products) return [];
    const uniqueCategories = new Set(
      products
        .map((product) => product.category)
        .filter((category): category is string => !!category)
    );
    return Array.from(uniqueCategories);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((product: Product) => {
      const matchesSearch = filters.search 
        ? product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          product.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
          product.sku?.toLowerCase().includes(filters.search.toLowerCase()) ||
          product.barcode?.toLowerCase().includes(filters.search.toLowerCase())
        : true;

      const matchesCategory = filters.category === 'all' || !filters.category
        ? true
        : product.category === filters.category;

      const matchesStockStatus = filters.stockStatus === 'all'
        ? true
        : filters.stockStatus === 'low'
          ? product.stock_quantity <= product.minimum_stock
          : product.stock_quantity > product.minimum_stock;

      return matchesSearch && matchesCategory && matchesStockStatus;
    });
  }, [products, filters]);

  return (
    <div className="container mx-auto px-2 py-4 space-y-4 animate-fadeIn max-w-full md:max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center gap-3">
        <h1 className="text-xl md:text-3xl font-heading font-bold">Produtos</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <ProductFilters 
        categories={categories}
        onFilterChange={setFilters}
      />

      <ProductList products={filteredProducts} isLoading={isLoading} />
      
      <CreateProductDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
