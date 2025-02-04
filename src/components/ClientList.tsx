import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreditCard, History, Trash2, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateDebtDialog } from "./CreateDebtDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { InvoiceDialog } from "./InvoiceDialog";
import { ClientDetailsDialog } from "./ClientDetailsDialog";

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
  invoice_month: string;
}

export function ClientList() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string>("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      // First, get clients with their debts
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          debts (
            amount,
            transaction_date,
            id
          )
        `);

      if (clientsError) throw clientsError;

      // Then, get all payments for each client's debts
      const clientsWithPayments = await Promise.all(
        clientsData.map(async (client: any) => {
          const debtIds = client.debts.map((debt: any) => debt.id);
          
          const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select('amount')
            .in('debt_id', debtIds);

          if (paymentsError) throw paymentsError;

          const totalDebt = client.debts.reduce((sum: number, debt: any) => sum + Number(debt.amount), 0);
          const totalPayments = payments?.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0) || 0;
          
          const hasOverdueBills = client.debts.some((debt: any) => {
            return debt.transaction_date && parseISO(debt.transaction_date) < new Date();
          });

          return {
            id: client.id,
            name: client.name,
            total_debt: totalDebt - totalPayments,
            is_overdue: hasOverdueBills
          };
        })
      );

      return clientsWithPayments;
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

  const deleteTransaction = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', transactionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Transação excluída com sucesso');
      queryClient.invalidateQueries({ queryKey: ['transactions', selectedClient] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: () => {
      toast.error('Erro ao excluir transação');
    }
  });

  const handleViewHistory = (clientId: string, clientName: string) => {
    setSelectedClient(clientId);
    setSelectedClientName(clientName);
    setIsHistoryOpen(true);
  };

  const handleViewInvoice = (clientId: string, clientName: string) => {
    setSelectedClient(clientId);
    setSelectedClientName(clientName);
    setIsInvoiceOpen(true);
  };

  const handleViewDetails = (clientId: string, clientName: string) => {
    setSelectedClient(clientId);
    setSelectedClientName(clientName);
    setIsDetailsOpen(true);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      deleteTransaction.mutate(transactionId);
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

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
                      <span className="text-destructive">Atrasado</span>
                    ) : (
                      <span className="text-green-500">Em dia</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <CreateDebtDialog clientId={client.id} clientName={client.name} />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewInvoice(client.id, client.name)}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Faturas
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(client.id, client.name)}
                    >
                      <User className="h-4 w-4 mr-1" />
                      Detalhes
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewHistory(client.id, client.name)}
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
                  <TableHead>Mês Referência</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {transaction.transaction_date ? 
                        format(parseISO(transaction.transaction_date), 'dd/MM/yyyy') : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>{transaction.description || '-'}</TableCell>
                    <TableCell>R$ {Number(transaction.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      {transaction.invoice_month ? 
                        format(parseISO(transaction.invoice_month), 'MM/yyyy') : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {selectedClient && (
        <>
          <InvoiceDialog
            clientId={selectedClient}
            clientName={selectedClientName}
            open={isInvoiceOpen}
            onOpenChange={setIsInvoiceOpen}
          />
          <ClientDetailsDialog
            clientId={selectedClient}
            clientName={selectedClientName}
            open={isDetailsOpen}
            onOpenChange={setIsDetailsOpen}
          />
        </>
      )}
    </>
  );
}
