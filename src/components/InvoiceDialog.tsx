import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { useState } from "react";

interface InvoiceDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDialog({ clientId, clientName, open, onOpenChange }: InvoiceDialogProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: invoiceDebts } = useQuery({
    queryKey: ['invoice-debts', clientId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('client_id', clientId)
        .filter('invoice_month', 'gte', startDate.toISOString().split('T')[0])
        .filter('invoice_month', 'lte', endDate.toISOString().split('T')[0])
        .order('invoice_month', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const totalAmount = invoiceDebts?.reduce((sum, debt) => sum + Number(debt.amount), 0) || 0;

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
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
                {format(currentMonth, 'MMMM/yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          <div className="mb-4 text-right">
            <span className="text-lg font-semibold">
              Total: R$ {totalAmount.toFixed(2)}
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
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
                    {debt.status === 'pending' ? 'Pendente' : 'Pago'}
                  </TableCell>
                </TableRow>
              ))}
              {(!invoiceDebts || invoiceDebts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
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