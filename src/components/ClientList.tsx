
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, parseISO, isBefore, startOfMonth, endOfMonth, isAfter, setHours, setMinutes, setSeconds, setMilliseconds, addMonths, differenceInDays } from "date-fns";
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
  const [statusFilter, setStatusFilter] = useState("todos");
  const queryClient = useQueryClient();
  
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data: clientsData, error: clientsError } = await supabase
        .from('lblz_clients')
        .select(`
          id,
          name,
          invoice_day,
          last_invoice_sent_at,
          last_invoice_sent_month,
          lblz_debts (
            amount,
            transaction_date,
            invoice_month,
            id,
            status,
            lblz_payments (
              amount,
              invoice_month
            )
          )
        `);

      if (clientsError) throw clientsError;

      const currentDate = new Date();
      const currentMonth = startOfMonth(currentDate);

      const clientsWithStatus = clientsData.map((client: any) => {
        const debts = client.lblz_debts || [];
        let totalDebt = 0;
        let hasOverdueDebts = false;
        let hasPartialOverdueDebts = false;
        let hasPendingDebts = false;
        const invoiceDay = client.invoice_day || 1;
        let daysOverdue = 0;
        let overdueAmount = 0;

        // Calculate next due date
        const nextDueDate = setMilliseconds(
          setSeconds(
            setMinutes(
              setHours(
                new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  invoiceDay
                ),
                23
              ),
              59
            ),
            59
          ),
          999
        );

        // If current date is past this month's due date, set next due date to next month
        if (isAfter(currentDate, nextDueDate)) {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        // Calculate days until due
        const daysUntilDue = differenceInDays(nextDueDate, currentDate);

        // Calculate next invoice amount (sum of all debts for the current month)
        let nextInvoiceAmount = 0;
        const nextInvoiceMonth = format(nextDueDate, 'yyyy-MM');

        // Find the most recent overdue month
        let lastOverdueMonth: Date | null = null;

        debts.forEach((debt: any) => {
          const debtAmount = Number(debt.amount);
          const totalPayments = (debt.lblz_payments || []).reduce((sum: number, payment: any) => 
            sum + Number(payment.amount), 0);
          const remainingAmount = debtAmount - totalPayments;

          totalDebt += remainingAmount;

          // Add to next invoice amount if the debt is for the next due month
          if (debt.invoice_month?.startsWith(nextInvoiceMonth)) {
            nextInvoiceAmount += remainingAmount;
          }

          const debtMonth = startOfMonth(parseISO(debt.invoice_month));
          const isPastMonth = isBefore(debtMonth, currentMonth);
          const isCurrentMonth = debtMonth.getTime() === currentMonth.getTime();
          const hasPartialPayment = totalPayments > 0 && totalPayments < debtAmount;
          
          if ((isPastMonth || isCurrentMonth) && (debt.status === 'parcial' || debt.status === 'aberta')) {
            const dueDate = setMilliseconds(
              setSeconds(
                setMinutes(
                  setHours(
                    new Date(debtMonth.getFullYear(), debtMonth.getMonth(), invoiceDay),
                    23
                  ),
                  59
                ),
                59
              ),
              999
            );
            
            if (isAfter(currentDate, dueDate)) {
              if (!lastOverdueMonth || isAfter(debtMonth, lastOverdueMonth)) {
                lastOverdueMonth = debtMonth;
                daysOverdue = Math.abs(differenceInDays(currentDate, dueDate));
                overdueAmount = remainingAmount;
              }
              
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
          status,
          next_due_date: nextDueDate,
          days_until_due: daysUntilDue,
          days_overdue: daysOverdue,
          next_invoice_amount: nextInvoiceAmount,
          overdue_amount: overdueAmount,
          last_invoice_sent_at: client.last_invoice_sent_at,
          last_invoice_sent_month: client.last_invoice_sent_month
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
        .from('lblz_debts')
        .select('*')
        .eq('client_id', selectedClient)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    }
  });

  const deleteTransaction = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error: paymentsError } = await supabase
        .from('lblz_payments')
        .delete()
        .eq('debt_id', transactionId);
      
      if (paymentsError) throw paymentsError;

      const { error: debtError } = await supabase
        .from('lblz_debts')
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
    const { data: debtData, error: debtError } = await supabase
      .from('lblz_debts')
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
    const statusMatch = statusFilter === "todos" || client.status === statusFilter;
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
