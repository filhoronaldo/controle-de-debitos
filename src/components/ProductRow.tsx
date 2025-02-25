
import { ProductDetailsDialog } from "@/components/ProductDetailsDialog";
import { EditProductDialog } from "@/components/EditProductDialog";
import { StockMovementDialog } from "@/components/StockMovementDialog";
import { Button } from "@/components/ui/button";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Product } from "@/types/product";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { Eye, Pencil, Package } from "lucide-react";

interface ProductRowProps {
  product: Product;
}

export function ProductRow({ product }: ProductRowProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showStockMovement, setShowStockMovement] = useState(false);

  return (
    <TableRow>
      <TableCell>{product.name}</TableCell>
      <TableCell>{product.category || '-'}</TableCell>
      <TableCell>
        <span className={product.stock_quantity <= product.minimum_stock ? "text-destructive" : ""}>
          {product.stock_quantity}
        </span>
      </TableCell>
      <TableCell>{formatCurrency(product.price)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowDetails(true)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowEdit(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowStockMovement(true)}>
            <Package className="h-4 w-4" />
          </Button>
        </div>
        {showDetails && (
          <ProductDetailsDialog
            product={product}
            open={showDetails}
            onOpenChange={setShowDetails}
          />
        )}
        {showEdit && (
          <EditProductDialog
            product={product}
            open={showEdit}
            onOpenChange={setShowEdit}
          />
        )}
        {showStockMovement && (
          <StockMovementDialog
            product={product}
            open={showStockMovement}
            onOpenChange={setShowStockMovement}
          />
        )}
      </TableCell>
    </TableRow>
  );
}
