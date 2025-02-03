import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CreatePaymentDialog } from "./CreatePaymentDialog";
import { toast } from "sonner";

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  created_at: string;
  transaction_date: string | null;
  invoice_month: string | null;
}

interface InvoiceData {
  transactions: Transaction[];
  balance: number;
}

interface InvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  month: Date;
}

interface PaymentToDelete {
  id: string;
  amount: number;
}

export function InvoiceDialog({
  isOpen,
  onClose,
  clientId,
  clientName,
  month,
}: InvoiceDialogProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentToDelete | null>(null);

  const fetchInvoiceData = async () => {
    setIsLoading(true);
    try {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const { data: debtsData, error: debtsError } = await supabase
        .from("debts")
        .select("*")
        .eq("client_id", clientId)
        .gte("transaction_date", startOfMonth.toISOString())
        .lte("transaction_date", endOfMonth.toISOString())
        .order("transaction_date", { ascending: true });

      if (debtsError) throw debtsError;

      const transactions = debtsData || [];
      const balance = transactions.reduce((acc, transaction) => acc + Number(transaction.amount), 0);
      
      setInvoiceData({ 
        transactions: transactions as Transaction[], 
        balance 
      });
    } catch (error) {
      console.error("Error fetching invoice data:", error);
      toast.error("Erro ao carregar dados da fatura");
    } finally {
      setIsLoading(false);
    }
  };

  const refetchInvoiceData = async () => {
    await fetchInvoiceData();
  };

  const handleDeletePayment = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!paymentToDelete) return;

    try {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentToDelete.id);

      if (error) throw error;

      toast.success("Pagamento excluído com sucesso!");
      await refetchInvoiceData();
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Erro ao excluir pagamento");
    } finally {
      setIsDeletePopoverOpen(false);
      setPaymentToDelete(null);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeletePopoverOpen(false);
    setPaymentToDelete(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Fatura de {clientName} - {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Transações</h3>
            <CreatePaymentDialog 
              debtId={clientId} 
              amount={0}
              onPaymentComplete={refetchInvoiceData} 
            />
          </div>

          {isLoading ? (
            <div>Carregando...</div>
          ) : (
            <>
              {invoiceData?.transactions?.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {transaction.transaction_date ? 
                        format(new Date(transaction.transaction_date), "dd/MM/yyyy") :
                        format(new Date(transaction.created_at), "dd/MM/yyyy")
                      }
                    </span>
                    <span className="font-medium">{transaction.description || 'Sem descrição'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-red-600 font-medium">
                      R$ {Math.abs(Number(transaction.amount)).toFixed(2)}
                    </span>

                    <Popover
                      open={isDeletePopoverOpen && paymentToDelete?.id === transaction.id}
                      onOpenChange={(open) => !open && setPaymentToDelete(null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPaymentToDelete({
                              id: transaction.id,
                              amount: Math.abs(Number(transaction.amount)),
                            });
                            setIsDeletePopoverOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-fit p-2"
                        side="left"
                        align="center"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Confirma?</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleDeletePayment}
                              className="text-green-600 hover:text-green-600 hover:bg-green-100"
                            >
                              <Check className="h-4 w-4" />
                              <span className="ml-1">SIM</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelDelete}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                              <span className="ml-1">NÃO</span>
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <span className="font-semibold">Saldo Total</span>
                <span className="text-red-600 font-semibold">
                  R$ {Math.abs(invoiceData?.balance || 0).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}