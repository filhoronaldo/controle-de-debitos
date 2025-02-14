
export interface Client {
  id: string;
  name: string;
  total_debt: number;
  status: 'em_dia' | 'atrasado' | 'atrasado_parcial' | 'pendente';
  next_due_date?: Date;
  days_until_due?: number;
  next_invoice_amount?: number;
}
