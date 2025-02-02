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
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { data: invoiceData, refetch } = useQuery({
    queryKey: ['invoice-debts', clientId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
      const { data: debts, error: debtsError } = await supabase
        .from('debts')
        .select(`
          *,
          payments (
            amount,
            payment_date,
            payment_method
          )
        `)
        .eq('client_id', clientId)
        .gte('invoice_month', startDate)
        .lte('invoice_month', endDate)
        .order('invoice_month', { ascending: true });

      if (debtsError) {
        toast.error('Erro ao carregar faturas');
        throw debtsError;
      }

      return debts;
    }
  });

  const calculateDebtStatus = (debt: any) => {
    const totalPaid = debt.payments?.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0) || 0;
    return totalPaid >= Number(debt.amount) ? 'paid' : 'pending';
  };

  const totalAmount = invoiceData?.reduce((sum, debt) => sum + Number(debt.amount), 0) || 0;
  const totalPaid = invoiceData?.reduce((sum, debt) => {
    return sum + (debt.payments?.reduce((pSum: number, payment: any) => pSum + Number(payment.amount), 0) || 0);
  }, 0) || 0;
  const pendingAmount = totalAmount - totalPaid;

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handlePaymentComplete = () => {
    refetch();
    setIsPaymentDialogOpen(false);
    toast.success('Pagamento registrado com sucesso!');
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
            <CreatePaymentDialog 
              debtId={selectedDebtId || ''} 
              amount={pendingAmount}
              onPaymentComplete={handlePaymentComplete}
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Pagamento
                </Button>
              }
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mês Referência</TableHead>
                <TableHead>Pagamentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceData?.map((debt) => {
                const status = calculateDebtStatus(debt);
                const totalPaid = debt.payments?.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0) || 0;
                
                return (
                  <TableRow key={debt.id} onClick={() => setSelectedDebtId(debt.id)}>
                    <TableCell>
                      {debt.transaction_date ? 
                        format(parseISO(debt.transaction_date), 'dd/MM/yyyy') : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>{debt.description || '-'}</TableCell>
                    <TableCell>R$ {Number(debt.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {status === 'pending' ? (
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
                      {debt.invoice_month ? 
                        format(parseISO(debt.invoice_month), "MMMM 'de' yyyy", { locale: ptBR }) : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Total Pago: R$ {totalPaid.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          {debt.payments?.length || 0} pagamento(s)
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!invoiceData || invoiceData.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Nenhum débito encontrado para este mês
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