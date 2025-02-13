export interface Transaction {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  invoice_month: string;
  status: 'aberta' | 'paga' | 'parcial';
}