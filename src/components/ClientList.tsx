import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, parseISO, isBefore, startOfMonth, endOfMonth, isAfter, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { toast } from "sonner";
import { InvoiceDialog } from "./InvoiceDialog";
import { ClientDetailsDialog } from "./ClientDetailsDialog";
import { TransactionHistory } from "./TransactionHistory";
import { ClientRow } from "./ClientRow";
import { Client } from "@/types/client";
import { Transaction } from "@/types/transaction";

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
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          invoice_day,
          debts (
            amount,
            transaction_date,
            invoice_month,
            id,
            status,
            payments (
              amount,
              invoice_month
            )
          )
        `);

      if (clientsError) throw clientsError;

      const currentDate = new Date();
      const currentMonth = startOfMonth(currentDate);

      const clientsWithStatus = clientsData.map((client: any) => {
        const debts = client.debts || [];
        let totalDebt = 0;
        let hasOverdueDebts = false;
        let hasPartialOverdueDebts = false;
        let hasPendingDebts = false;
        const invoiceDay = client.invoice_day || 1;

        debts.forEach((debt: any) => {
          const debtAmount = Number(debt.amount);
          totalDebt += debtAmount;

          const totalPayments = (debt.payments || []).reduce((sum: number, payment: any) => 
            sum + Number(payment.amount), 0);

          const debtMonth = startOfMonth(parseISO(debt.invoice_month));
          const isPastMonth = isBefore(debtMonth, currentMonth);
          const isCurrentMonth = debtMonth.getTime() === currentMonth.getTime();
          const hasPartialPayment = totalPayments > 0 && totalPayments < debtAmount;
          
          if (isPastMonth) {
            if (hasPartialPayment) {
              hasPartialOverdueDebts = true;
            } else if (debt.status === 'parcial' || debt.status === 'aberta') {
              hasOverdueDebts = true;
            }
          }
          
          if (isCurrentMonth && debt.status !== 'paga') {
            const dueDate = setMilliseconds(
              setSeconds(
                setMinutes(
                  setHours(
                    new Date(currentDate.getFullYear(), currentDate.getMonth(), invoiceDay),
                    23
                  ),
                  59
                ),
                59
              ),
              999
            );
            
            if (isAfter(currentDate, dueDate)) {
              if (hasPartialPayment) {
                hasPartialOverdueDebts = true;
              } else {
                hasOverdueDebts = true;
              }
            }
          }

          if (debt.status === 'parcial' || debt.status === 'aberta') {
            hasPendingDebts = true;
          }

          totalDebt -= totalPayments;
        });

        let status: Client['status'] = 'em_dia';
        if (hasOverdueDebts) {
          status = 'atrasado';
        } else if (hasPartialOverdueDebts) {
          status = 'atrasado_parcial';
        } else if (hasPendingDebts) {
          status = 'pendente';
        }

        return {
          id: client.id,
          name: client.name,
          total_debt: totalDebt,
          status
        };
      });

      return clientsWithStatus;
    }
  });

  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions', selectedClient],
    enabled: !!selectedClient && isHistoryOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('client_id', selectedClient)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
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
      refetchTransactions();
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
    queryClient.invalidateQueries({ queryKey: ['transactions', clientId] });
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
              <ClientRow
                key={client.id}
                client={client}
                onViewInvoice={handleViewInvoice}
                onViewDetails={handleViewDetails}
                onViewHistory={handleViewHistory}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <TransactionHistory
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        transactions={transactions}
        clientName={selectedClientName}
        onDeleteTransaction={handleDeleteTransaction}
      />

      {selectedClient && (
        <>
          <InvoiceDialog
            clientId={selectedClient}
            clientName={selectedClientName}
            open={isInvoiceOpen}
            onOpenChange={(open) => {
              setIsInvoiceOpen(open);
              if (!open) {
                queryClient.invalidateQueries({ queryKey: ['clients'] });
              }
            }}
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