
import { ProductDetailsDialog } from "@/components/ProductDetailsDialog";
import { Button } from "@/components/ui/button";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Product } from "@/types/product";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { Eye } from "lucide-react";

interface ProductRowProps {
  product: Product;
}

export function ProductRow({ product }: ProductRowProps) {
  const [showDetails, setShowDetails] = useState(false);

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
        <Button variant="ghost" size="icon" onClick={() => setShowDetails(true)}>
          <Eye className="h-4 w-4" />
        </Button>
        {showDetails && (
          <ProductDetailsDialog
            product={product}
            open={showDetails}
            onOpenChange={setShowDetails}
          />
        )}
      </TableCell>
    </TableRow>
  );
}
