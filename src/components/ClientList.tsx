import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, CreditCard, History, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateDebtDialog } from "./CreateDebtDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { format } from "date-fns";

interface Client {
  id: string;
  name: string;
  total_debt: number;
  is_overdue: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  status: string;
  invoice_month: string;
}

export function ClientList() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
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

  const { data: transactions } = useQuery({
    queryKey: ['transactions', selectedClient],
    enabled: !!selectedClient,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('client_id', selectedClient)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const handleViewHistory = (clientId: string) => {
    setSelectedClient(clientId);
    setIsHistoryOpen(true);
  };

  if (isLoading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  const selectedClientName = clients?.find(c => c.id === selectedClient)?.name;

  return (
    <>
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
                    <CreateDebtDialog clientId={client.id} clientName={client.name} />
                    <Button variant="outline" size="sm">
                      <CreditCard className="h-4 w-4 mr-1" />
                      Pagar
                    </Button>
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-1" />
                      Detalhes
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewHistory(client.id)}
                    >
                      <History className="h-4 w-4 mr-1" />
                      Histórico
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Histórico de Transações - {selectedClientName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mês Referência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {transaction.transaction_date ? 
                        format(new Date(transaction.transaction_date), 'dd/MM/yyyy') : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>{transaction.description || '-'}</TableCell>
                    <TableCell>R$ {Number(transaction.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {transaction.status === 'pending' ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-warning" />
                            <span className="text-warning">Pendente</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span className="text-success">Pago</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.invoice_month ? 
                        format(new Date(transaction.invoice_month), 'MM/yyyy') : 
                        '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}