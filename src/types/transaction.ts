
import { Json } from "@/integrations/supabase/types";

export interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  invoice_month: string;
  debt_id?: string;
}

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
  payments?: Payment[];
}
