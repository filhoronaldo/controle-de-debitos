
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface Product {
  id: string;
  nome: string;
  preco: string;
  imagem: string;
}

interface ProductSearchProps {
  onSelect: (product: Product) => void;
}

export function ProductSearch({ onSelect }: ProductSearchProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [search, setSearch] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', search],
    enabled: search.length > 2,
    queryFn: async () => {
      const response = await fetch(`https://api.facilzap.com.br/produtos?search[value]=${search}&search[column]=nome`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer 156746j4HFz8ZrNgX0001BSvS3jI2tAixLOzCZtzy4CO0Q2yFYsil8YyNUU2yPJxBFMF81HkZsQOu5RhV0ho7'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar produtos');
      }

      const json = await response.json();
      return json.data as Product[];
    },
    initialData: [] // Fornece um array vazio como valor inicial
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? products?.find((product) => product.nome === value)?.nome
            : "Buscar produto..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Digite o nome do produto..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {products?.map((product) => (
              <CommandItem
                key={product.id}
                value={product.nome}
                onSelect={(currentValue) => {
                  setValue(currentValue === value ? "" : currentValue);
                  onSelect(product);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === product.nome ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span>{product.nome}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(Number(product.preco))}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
