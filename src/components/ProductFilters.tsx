
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, FilterX } from "lucide-react";

interface ProductFiltersProps {
  categories: string[];
  onFilterChange: (filters: ProductFilters) => void;
}

export interface ProductFilters {
  search: string;
  category: string;
  stockStatus: 'all' | 'low' | 'normal';
}

export function ProductFilters({ categories, onFilterChange }: ProductFiltersProps) {
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: '',
    stockStatus: 'all',
  });

  function handleFilterChange(newFilters: Partial<ProductFilters>) {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  }

  function handleClearFilters() {
    const defaultFilters = {
      search: '',
      category: '',
      stockStatus: 'all' as const,
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={filters.search}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <div className="flex flex-row gap-4">
          <Select
            value={filters.category}
            onValueChange={(value) => handleFilterChange({ category: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.stockStatus}
            onValueChange={(value: 'all' | 'low' | 'normal') => 
              handleFilterChange({ stockStatus: value })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status do Estoque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="low">Estoque Baixo</SelectItem>
              <SelectItem value="normal">Estoque Normal</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleClearFilters}
            title="Limpar filtros"
          >
            <FilterX className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
