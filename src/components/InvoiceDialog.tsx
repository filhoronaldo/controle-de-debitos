import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { CreatePaymentDialog } from "./CreatePaymentDialog";
import { toast } from "sonner";

interface InvoiceDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDialog({ clientId, clientName, open, onOpenChange }: InvoiceDialogProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: invoiceData, refetch } = useQuery({
    queryKey: ['invoice-debts', clientId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
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

      // Transform the data to include both debts and payments in a single array
      const transactions = debts.reduce((acc: any[], debt: any) => {
        // Add the debt transaction
        acc.push({
          id: debt.id,
          date: debt.transaction_date || debt.created_at,
          description: debt.description,
          amount: debt.amount,
          type: 'debt',
          status: debt.status,
          invoice_month: debt.invoice_month
        });

        // Add all payment transactions for this debt
        if (debt.payments) {
          debt.payments.forEach((payment: any) => {
            acc.push({
              id: payment.id,
              date: payment.payment_date,
              description: `Pagamento - ${debt.description || 'Sem descrição'}`,
              amount: -payment.amount, // Negative to show it's a payment
              type: 'payment',
              status: 'paid',
              payment_method: payment.payment_method,
              invoice_month: payment.invoice_month
            });
          });
        }

        return acc;
      }, []);

      // Sort all transactions by date
      return transactions.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
  });

  const calculateTotals = () => {
    if (!invoiceData) return { totalAmount: 0, totalPaid: 0, pendingAmount: 0 };

    const totals = invoiceData.reduce((acc, transaction) => {
      if (transaction.type === 'debt') {
        acc.totalAmount += Number(transaction.amount);
      } else if (transaction.type === 'payment') {
        acc.totalPaid += Math.abs(Number(transaction.amount));
      }
      return acc;
    }, { totalAmount: 0, totalPaid: 0 });

    return {
      ...totals,
      pendingAmount: totals.totalAmount - totals.totalPaid
    };
  };

  const { totalAmount, totalPaid, pendingAmount } = calculateTotals();

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

  // Get the first pending debt ID for the payment dialog
  const firstPendingDebtId = invoiceData?.find(t => t.type === 'debt' && t.status === 'pending')?.id || null;

  const formatDate = (dateString: string) => {
    // Create a new Date object from the ISO string
    const date = new Date(dateString);
    // Add the timezone offset to get the correct local date
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() + timezoneOffset);
    return format(localDate, 'dd/MM/yyyy');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Fatura - {clientName}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">
                {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          <div className="mb-4 flex justify-between items-center">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">
                Total Pendente: <span className="font-medium text-foreground">R$ {pendingAmount.toFixed(2)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Total do Mês: <span className="font-medium text-foreground">R$ {totalAmount.toFixed(2)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Total Pago: <span className="font-medium text-success">R$ {totalPaid.toFixed(2)}</span>
              </div>
            </div>
            {firstPendingDebtId && (
              <CreatePaymentDialog 
                debtId={firstPendingDebtId} 
                amount={pendingAmount}
                onPaymentComplete={handlePaymentComplete}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Pagamento
                  </Button>
                }
              />
            )}
          </div>

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
              {invoiceData?.map((transaction) => (
                <TableRow 
                  key={transaction.id}
                  className={transaction.type === 'payment' ? 'bg-muted/30' : ''}
                >
                  <TableCell>
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className={transaction.type === 'payment' ? 'text-success' : ''}>
                    R$ {Math.abs(Number(transaction.amount)).toFixed(2)}
                    {transaction.type === 'payment' && transaction.payment_method && 
                      ` (${transaction.payment_method})`}
                  </TableCell>
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
                          <span className="text-success">
                            {transaction.type === 'payment' ? 'Pagamento' : 'Pago'}
                          </span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {transaction.invoice_month ? 
                      format(new Date(transaction.invoice_month), "MMMM 'de' yyyy", { locale: ptBR }) : 
                      '-'
                    }
                  </TableCell>
                </TableRow>
              ))}
              {(!invoiceData || invoiceData.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Nenhuma transação encontrada para este mês
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}