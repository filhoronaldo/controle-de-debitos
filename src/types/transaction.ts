
import { Json } from "@/integrations/supabase/types";

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  invoice_month: string;
  status: 'aberta' | 'paga' | 'parcial';
  client_id: string;
  created_at?: string;
  products?: Json;
}
