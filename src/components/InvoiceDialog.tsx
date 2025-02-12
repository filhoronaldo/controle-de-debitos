import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, setDate, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { CreatePaymentDialog } from "./CreatePaymentDialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface InvoiceDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDialog({ clientId, clientName, open, onOpenChange }: InvoiceDialogProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const queryClient = useQueryClient();

  const { data: invoiceData, refetch } = useQuery({
    queryKey: ['invoice-debts', clientId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const { data: client } = await supabase
        .from('clients')
        .select('invoice_day')
        .eq('id', clientId)
        .single();
      const { data: debts, error: debtsError } = await supabase
        .from('debts')
        .select(`
          *,
          payments (*)
        `)
        .eq('client_id', clientId)
        .gte('invoice_month', startDate)
        .lte('invoice_month', endDate)
        .order('invoice_month', { ascending: true });
      if (debtsError) {
        toast.error('Erro ao carregar faturas');
        throw debtsError;
      }
      const transactions = debts.reduce((acc: any[], debt: any) => {
        acc.push({
          id: debt.id,
          date: debt.transaction_date || debt.created_at,
          description: debt.description,
          amount: debt.amount,
          type: 'debt',
          invoice_month: debt.invoice_month,
        });
        if (debt.payments) {
          debt.payments.forEach((payment: any) => {
            acc.push({
              id: payment.id,
              date: payment.payment_date,
              description: "Pagamento",
              amount: -payment.amount,
              type: 'payment',
              payment_method: payment.payment_method,
              invoice_month: payment.invoice_month,
            });
          });
        }
        return acc;
      }, []);
      return {
        invoiceDay: client?.invoice_day || 1,
        transactions: transactions.sort((a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
      };
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pagamento excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['invoice-debts', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: () => {
      toast.error('Erro ao excluir pagamento');
    },
  });

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const calculateTotals = () => {
    if (!invoiceData?.transactions) return { totalAmount: 0, totalPaid: 0, pendingAmount: 0 };
    const totals = invoiceData.transactions.reduce((acc, transaction) => {
      if (transaction.type === 'debt') {
        acc.totalAmount += Number(transaction.amount);
      } else if (transaction.type === 'payment') {
        acc.totalPaid += Math.abs(Number(transaction.amount));
      }
      return acc;
    }, { totalAmount: 0, totalPaid: 0 });
    return {
      ...totals,
      pendingAmount: totals.totalAmount - totals.totalPaid,
    };
  };

  const getDueDate = () => {
    if (!invoiceData?.invoiceDay) return null;
    const dueDate = setDate(currentMonth, invoiceData.invoiceDay);
    return format(dueDate, "dd/MM/yyyy", { locale: ptBR });
  };

  const getInvoiceStatus = () => {
    const { totalAmount, totalPaid } = calculateTotals();
    const dueDate = getDueDate();
    const isPastDue = dueDate ? isBefore(new Date(parseISO(format(setDate(currentMonth, invoiceData?.invoiceDay || 1), 'yyyy-MM-dd'))), new Date()) : false;
    if (totalPaid >= totalAmount) {
      return { label: "Paga", variant: "outline" as const };
    }
    if (isPastDue) {
      if (totalPaid > 0) {
        return { label: "Vencida - Parcial", variant: "destructive" as const };
      }
      return { label: "Vencida", variant: "destructive" as const };
    }
    return { label: "Aberta", variant: "default" as const };
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handlePaymentComplete = () => {
    refetch();
    toast.success('Pagamento registrado com sucesso!');
  };

  const handleDeletePayment = (paymentId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este pagamento?')) {
      deletePayment.mutate(paymentId);
    }
  };

  const firstPendingDebtId = invoiceData?.transactions?.find(t => t.type === 'debt')?.id || null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() + timezoneOffset);
    return format(localDate, 'dd/MM/yyyy');
  };

  const formatMonthYear = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() + timezoneOffset);
    return format(localDate, "MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto w-[95vw] max-w-lg p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Fatura - {clientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Button size="sm" variant="outline" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium">{format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}</span>
            <Button size="sm" variant="outline" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <p>
              <strong>Status:</strong> <Badge variant={getInvoiceStatus().variant}>{getInvoiceStatus().label}</Badge>
            </p>
            <p><strong>Total Pendente:</strong> R$ {calculateTotals().pendingAmount.toFixed(2)}</p>
            <p><strong>Total do Mês:</strong> R$ {calculateTotals().totalAmount.toFixed(2)}</p>
            <p><strong>Total Pago:</strong> R$ {calculateTotals().totalPaid.toFixed(2)}</p>
            <p><strong>Vencimento:</strong> {getDueDate()}</p>
          </div>
          {firstPendingDebtId && (
            <CreatePaymentDialog
              debtId={firstPendingDebtId}
              clientId={clientId}
              clientName={clientName}
              onPaymentComplete={handlePaymentComplete}
            />
          )}
          <div className="space-y-4">
            {invoiceData?.transactions?.length > 0 ? (
              invoiceData.transactions.map((transaction) => (
                <div key={transaction.id} className="bg-background p-4 rounded-lg shadow-sm border">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Data:</span>
                    <span className="text-sm">{formatDate(transaction.date)}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm font-medium">Descrição:</span>
                    <span className="text-sm">{transaction.description}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm font-medium">Valor:</span>
                    <span className="text-sm">R$ {Math.abs(Number(transaction.amount)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm font-medium">Mês Referência:</span>
                    <span className="text-sm">{formatMonthYear(transaction.invoice_month)}</span>
                  </div>
                  {transaction.type === 'payment' && (
                    <div className="flex justify-end mt-4">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePayment(transaction.id)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p>Nenhuma transação encontrada para este mês</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
