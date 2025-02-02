import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientHistory() {
  const { clientId } = useParams();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['client-history', clientId],
    queryFn: async () => {
      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .single();

      const { data: debts } = await supabase
        .from('debts')
        .select(`
          *,
          payments (*)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      return {
        clientName: client?.name,
        transactions: debts || []
      };
    }
  });

  if (isLoading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-heading font-bold">
        Histórico de Transações - {transactions?.clientName}
      </h1>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mês Fatura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(new Date(transaction.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>{transaction.description || '-'}</TableCell>
                <TableCell>R$ {Number(transaction.amount).toFixed(2)}</TableCell>
                <TableCell>
                  <span className={transaction.status === 'pending' ? 'text-yellow-600' : 'text-green-600'}>
                    {transaction.status === 'pending' ? 'Pendente' : 'Pago'}
                  </span>
                </TableCell>
                <TableCell>
                  {transaction.invoice_month ? 
                    format(new Date(transaction.invoice_month), "MMMM/yyyy", { locale: ptBR }) : 
                    '-'
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}