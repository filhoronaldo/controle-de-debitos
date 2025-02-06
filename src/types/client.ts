export interface Client {
  id: string;
  name: string;
  total_debt: number;
  status: 'em_dia' | 'atrasado' | 'atrasado_parcial' | 'pendente';
}