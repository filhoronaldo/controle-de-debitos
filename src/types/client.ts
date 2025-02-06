export interface Client {
  id: string;
  name: string;
  total_debt: number;
  is_overdue: boolean;
  has_pending_debts: boolean;
}