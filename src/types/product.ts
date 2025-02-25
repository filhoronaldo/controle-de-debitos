
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  minimum_stock: number;
  image_url?: string;
  sku?: string;
  barcode?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export type ProductFormData = Omit<Product, 'id' | 'created_at' | 'updated_at'>;

export interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  type: 'entrada' | 'saída';
  description?: string;
  created_at: string;
}
