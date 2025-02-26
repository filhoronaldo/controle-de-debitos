
import { useState } from "react";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProductList } from "@/components/ProductList";
import { CreateProductDialog } from "@/components/CreateProductDialog";
import { supabase } from "@/integrations/supabase/client";

export default function Products() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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

  return (
    <div className="container mx-auto px-2 py-4 space-y-4 animate-fadeIn max-w-full md:max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center gap-3">
        <h1 className="text-xl md:text-3xl font-heading font-bold">Produtos</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <ProductList products={products || []} isLoading={isLoading} />
      
      <CreateProductDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
