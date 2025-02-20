
export interface Client {
  id: string;
  name: string;
  phone: string;  // Adicionando a propriedade phone
  total_debt: number;
  status: 'em_dia' | 'atrasado' | 'atrasado_parcial' | 'pendente';
  next_due_date?: Date;
  days_until_due?: number;
  days_overdue: number;
  next_invoice_amount?: number;
  overdue_amount: number;
  last_invoice_sent_at?: string;
  last_invoice_sent_month?: string;
}
