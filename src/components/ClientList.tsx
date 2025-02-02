import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, CreditCard, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  name: string;
  total_debt: number;
  is_overdue: boolean;
}

export function ClientList() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      // Fetch clients with their total debt and overdue status
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          debts (
            amount,
            transaction_date,
            status
          )
        `);

      if (error) throw error;

      return data.map((client: any) => {
        const totalDebt = client.debts.reduce((sum: number, debt: any) => sum + Number(debt.amount), 0);
        const hasOverdueBills = client.debts.some((debt: any) => {
          return debt.transaction_date && new Date(debt.transaction_date) < new Date() && debt.status === 'pending';
        });

        return {
          id: client.id,
          name: client.name,
          total_debt: totalDebt,
          is_overdue: hasOverdueBills
        };
      });
    }
  });

  if (isLoading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Débito Total</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients?.map((client) => (
            <TableRow key={client.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell>R$ {client.total_debt.toFixed(2)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {client.is_overdue ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">Atrasado</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-500">Em dia</span>
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Pagar
                  </Button>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-1" />
                    Detalhes
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}