import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
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

  const { data: invoiceDebts, refetch } = useQuery({
    queryKey: ['invoice-debts', clientId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('client_id', clientId)
        .gte('invoice_month', startDate)
        .lte('invoice_month', endDate)
        .order('invoice_month', { ascending: true });

      if (error) {
        toast.error('Erro ao carregar faturas');
        throw error;
      }
      return data;
    }
  });

  const totalAmount = invoiceDebts?.reduce((sum, debt) => sum + Number(debt.amount), 0) || 0;
  const pendingAmount = invoiceDebts?.reduce((sum, debt) => 
    debt.status === 'pending' ? sum + Number(debt.amount) : sum, 0
  ) || 0;

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
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mês Referência</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceDebts?.map((debt) => (
                <TableRow key={debt.id}>
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
                      {debt.status === 'pending' ? (
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
                    {debt.status === 'pending' && (
                      <CreatePaymentDialog 
                        debtId={debt.id} 
                        amount={Number(debt.amount)}
                        onPaymentComplete={handlePaymentComplete}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!invoiceDebts || invoiceDebts.length === 0) && (
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