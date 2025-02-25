
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Product } from "@/types/product";
import { formatCurrency } from "@/lib/utils";

interface ProductDetailsDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailsDialog({ product, open, onOpenChange }: ProductDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Detalhes do produto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {product.description && (
            <div>
              <h4 className="text-sm font-medium">Descrição</h4>
              <p className="text-sm text-muted-foreground">{product.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium">Preço de Venda</h4>
              <p className="text-sm text-muted-foreground">{formatCurrency(product.price)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium">Preço de Custo</h4>
              <p className="text-sm text-muted-foreground">{formatCurrency(product.cost_price)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium">Quantidade em Estoque</h4>
              <p className="text-sm text-muted-foreground">{product.stock_quantity}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium">Estoque Mínimo</h4>
              <p className="text-sm text-muted-foreground">{product.minimum_stock}</p>
            </div>
          </div>

          {(product.sku || product.barcode) && (
            <div className="grid grid-cols-2 gap-4">
              {product.sku && (
                <div>
                  <h4 className="text-sm font-medium">SKU</h4>
                  <p className="text-sm text-muted-foreground">{product.sku}</p>
                </div>
              )}
              {product.barcode && (
                <div>
                  <h4 className="text-sm font-medium">Código de Barras</h4>
                  <p className="text-sm text-muted-foreground">{product.barcode}</p>
                </div>
              )}
            </div>
          )}

          {product.category && (
            <div>
              <h4 className="text-sm font-medium">Categoria</h4>
              <p className="text-sm text-muted-foreground">{product.category}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
