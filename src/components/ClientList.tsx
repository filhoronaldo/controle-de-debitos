
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
import { ClientFilters } from "./ClientFilters";

export function ClientList() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string>("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
      // Primeiro, excluir todos os pagamentos associados à dívida
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('debt_id', transactionId);
      
      if (paymentsError) throw paymentsError;

      // Depois, excluir a dívida
      const { error: debtError } = await supabase
        .from('debts')
        .delete()
        .eq('id', transactionId);
      
      if (debtError) throw debtError;
    },
    onSuccess: () => {
      toast.success('Transação excluída com sucesso');
      refetchTransactions();
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) => {
      console.error('Error deleting transaction:', error);
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

  const handleDeleteTransaction = async (transactionId: string) => {
    // Primeiro, buscar o status da dívida
    const { data: debtData, error: debtError } = await supabase
      .from('debts')
      .select('status')
      .eq('id', transactionId)
      .single();

    if (debtError) {
      console.error('Error fetching debt status:', debtError);
      toast.error('Erro ao verificar status da dívida');
      return;
    }

    if (debtData.status === 'parcial') {
      toast.error('Não é possível excluir débitos com pagamentos parciais. Remova primeiro os pagamentos associados.');
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      deleteTransaction.mutate(transactionId);
    }
  };

  const filteredClients = clients?.filter((client) => {
    const nameMatch = client.name.toLowerCase().includes(nameFilter.toLowerCase());
    const statusMatch = !statusFilter || client.status === statusFilter;
    return nameMatch && statusMatch;
  });

  if (isLoading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  return (
    <>
      <ClientFilters
        nameFilter={nameFilter}
        statusFilter={statusFilter}
        onNameFilterChange={setNameFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="space-y-2">
        {filteredClients?.map((client) => (
          <ClientRow
            key={client.id}
            client={client}
            onViewInvoice={handleViewInvoice}
            onViewDetails={handleViewDetails}
            onViewHistory={handleViewHistory}
          />
        ))}
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

