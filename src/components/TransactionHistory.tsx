import { Button } from "@/components/ui/button";
import { FileText, Trash2, Package2, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Transaction, Payment } from "@/types/transaction";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TransactionHistoryProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[] | undefined;
  clientName: string;
  onDeleteTransaction: (transactionId: string) => void;
}

interface ClientDetails {
  name: string;
  document: string | null;
  address: string | null;
  invoice_day: number;
}

export function TransactionHistory({
  isOpen,
  onOpenChange,
  transactions,
  clientName,
  onDeleteTransaction,
}: TransactionHistoryProps) {
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [selectedDebts, setSelectedDebts] = useState<string[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchClientDetails = async () => {
      if (transactions && transactions.length > 0) {
        const { data } = await supabase
          .from("lblz_clients")
          .select("name, document, address, invoice_day")
          .eq("name", clientName)
          .single();

        if (data) {
          setClientDetails(data as ClientDetails);
        }
      }
    };
    fetchClientDetails();
  }, [clientName, transactions]);

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este pagamento?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("lblz_payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;

      toast.success("Pagamento excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error("Erro ao excluir pagamento");
    }
  };

  const handleToggleDebt = (debtId: string) => {
    setSelectedDebts(prev => 
      prev.includes(debtId) 
        ? prev.filter(id => id !== debtId)
        : [...prev, debtId]
    );
  };

  const handleSelectAllDebts = () => {
    if (!transactions) return;
    
    if (selectedDebts.length === transactions.length) {
      setSelectedDebts([]);
    } else {
      const allDebtIds = transactions.map(t => t.id);
      setSelectedDebts(allDebtIds);
    }
  };

  const handleDeleteSelectedDebts = async () => {
    if (selectedDebts.length === 0) {
      toast.error("Selecione pelo menos um débito para excluir");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir ${selectedDebts.length} débito(s)?`)) {
      return;
    }

    try {
      const { error: paymentsError } = await supabase
        .from("lblz_payments")
        .delete()
        .in("debt_id", selectedDebts);

      if (paymentsError) {
        console.error('Error deleting payments:', paymentsError);
        throw paymentsError;
      }

      const { error: debtsError } = await supabase
        .from("lblz_debts")
        .delete()
        .in("id", selectedDebts);

      if (debtsError) {
        console.error('Error deleting debts:', debtsError);
        throw debtsError;
      }

      toast.success(`${selectedDebts.length} débito(s) excluído(s) com sucesso`);
      
      setSelectedDebts([]);
      
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["total-debt"] });
      queryClient.invalidateQueries({ queryKey: ["today-payments"] });
      
      if (transactions?.length === selectedDebts.length) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error in deletion process:', error);
      toast.error("Erro ao excluir débitos. Por favor, tente novamente.");
    }
  };

  const handleGeneratePromissoryNote = (transaction: Transaction) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    if (!clientDetails) {
      console.error("Detalhes do cliente não encontrados.");
      return;
    }

    if (!transaction) {
      console.error("Transação inválida.");
      return;
    }

    const getInstallmentInfo = (description: string | null): { current: number; total: number } => {
      if (!description) return { current: 1, total: 1 };
      const match = description.match(/\((\d+)\/(\d+)\)$/);
      if (!match) return { current: 1, total: 1 };
      return {
        current: parseInt(match[1], 10),
        total: parseInt(match[2], 10),
      };
    };

    const installmentInfo = getInstallmentInfo(transaction.description);

    const formatMoneyInWords = (value: number) => {
      const formatter = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
      });

      const numberToWords = (num: number): string => {
        const units = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
        const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
        const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
        if (num < 10) return units[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) {
          const digit = num % 10;
          const ten = Math.floor(num / 10);
          return digit === 0 ? tens[ten] : `${tens[ten]} e ${units[digit]}`;
        }
        return num.toString();
      };

      const [reais, centavos] = formatter
        .format(value)
        .replace("R$", "")
        .trim()
        .split(",")
        .map((part) => parseInt(part.replace(/\D/g, "")));
      const reaisText = numberToWords(reais);
      const centavosText = numberToWords(centavos);
      return `${reaisText} reais e ${centavosText} centavos`;
    };

    const formatDateInWords = (date: string) => {
      const d = parseISO(date);
      const month = format(d, "MMMM", { locale: ptBR });
      const year = format(d, "yyyy");
      const invoiceDay = clientDetails?.invoice_day || 1;

      const numberToWords = (num: number): string => {
        const units = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
        const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
        const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
        if (num < 10) return units[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) {
          const digit = num % 10;
          const ten = Math.floor(num / 10);
          return digit === 0 ? tens[ten] : `${tens[ten]} e ${units[digit]}`;
        }
        return num.toString();
      };

      const dayInWords = numberToWords(invoiceDay);
      return `${dayInWords} de ${month} de ${year}`;
    };

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nota Promissória</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      line-height: 1.6;
    }
    h1 {
      text-align: center;
    }
    hr {
      border: none;
      border-top: 1px solid black;
      margin: 20px 0;
    }
    .signature-line {
      margin-top: 40px;
      text-align: center;
    }
  </style>
</head>
<body onload="window.print()">
  <h1>Nota Promissória</h1>
  <p><strong>REPÚBLICA FEDERATIVA DO BRASIL</strong></p>
  <p><strong>NOTA PROMISSÓRIA Nº ${installmentInfo.current}/${installmentInfo.total}</strong></p>
  <p><strong>Valor R$ ${transaction.amount}</strong></p>
  <p>
    No dia ${formatDateInWords(transaction.invoice_month || new Date().toISOString())} pagaremos por esta única via de NOTA PROMISSÓRIA 
    a CLAUDELANE MARIA DA SILVA 10707874424 CNPJ 27.031.139/0001-59 ou à sua ordem a quantia de ${formatMoneyInWords(Number(transaction.amount))} 
    em moeda corrente deste país.
  </p>
  <p>Pagável em CARUARU</p>
  <p><strong>Emitente:</strong> ${clientDetails?.name || "Não informado"}</p>
  <p><strong>CPF/CNPJ:</strong> ${clientDetails?.document || "Não informado"}</p>
  <p><strong>Endereço:</strong> ${clientDetails?.address || "Não informado"}</p>
  <div class="signature-line">
    <hr>
    <p>Assinatura do Emitente</p>
  </div>
</body>
</html>
`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Transações - {clientName}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAllDebts}
          >
            {selectedDebts.length === (transactions?.length || 0) ? "Desmarcar Todos" : "Selecionar Todos"}
          </Button>
          
          {selectedDebts.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelectedDebts}
            >
              Excluir Selecionados ({selectedDebts.length})
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {transactions?.map((transaction) => (
            <div key={transaction.id} className="space-y-4">
              <div className="bg-background p-4 rounded-lg shadow-sm border">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedDebts.includes(transaction.id)}
                      onCheckedChange={() => handleToggleDebt(transaction.id)}
                    />
                    <div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Data:</span>
                        <span className="text-sm">
                          {transaction.transaction_date ? format(parseISO(transaction.transaction_date), "dd/MM/yyyy") : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm font-medium">Descrição:</span>
                        <span className="text-sm">{transaction.description || "-"}</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm font-medium">Valor:</span>
                        <span className="text-sm">{formatCurrency(Number(transaction.amount))}</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm font-medium">Mês Referência:</span>
                        <span className="text-sm">
                          {transaction.invoice_month ? format(parseISO(transaction.invoice_month), "MM/yyyy") : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge
                          variant={
                            transaction.status === "paga"
                              ? "success"
                              : transaction.status === "parcial"
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {transaction.status === "paga"
                            ? "Pago"
                            : transaction.status === "parcial"
                            ? "Parcial"
                            : "Em Aberto"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    {transaction.products && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Ver Produtos"
                          >
                            <Package2 className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Produtos do Débito</h4>
                            {Array.isArray(transaction.products) && transaction.products.map((product: any, index) => (
                              <div key={index} className="flex justify-between items-center py-1 border-b last:border-b-0">
                                <span className="text-sm">{product.description}</span>
                                <span className="text-sm font-medium">{formatCurrency(product.value)}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGeneratePromissoryNote(transaction)}
                      title="Gerar Promissória"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDeleteTransaction(transaction.id)}
                      title="Excluir Débito"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {transaction.payments && transaction.payments.length > 0 && (
                <div className="ml-8 space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Pagamentos</h4>
                  {transaction.payments.map((payment: Payment) => (
                    <div key={payment.id} className="bg-muted/50 p-3 rounded-md border">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {formatCurrency(Number(payment.amount))}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {format(parseISO(payment.payment_date), "dd/MM/yyyy")}
                            {payment.payment_method && ` - ${payment.payment_method}`}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeletePayment(payment.id)}
                          className="h-8 w-8"
                          title="Excluir Pagamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
