import { Button } from "@/components/ui/button";
import { FileText, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Transaction } from "@/types/transaction";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    const fetchClientDetails = async () => {
      if (transactions && transactions.length > 0) {
        const { data } = await supabase
          .from("clients")
          .select("name, document, address, invoice_day")
          .eq("name", clientName)
          .single();
        if (data) {
          setClientDetails(data);
        }
      }
    };
    fetchClientDetails();
  }, [clientName, transactions]);

  const handleGeneratePromissoryNote = (transaction: Transaction) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Verificar dados essenciais
    if (!clientDetails) {
      console.error("Detalhes do cliente não encontrados.");
      return;
    }

    if (!transaction) {
      console.error("Transação inválida.");
      return;
    }

    // Extrair informação de parcelamento da descrição
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

    // Formatar o valor por extenso
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

    // Formatar a data por extenso
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

    // Gerar o HTML
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

    // Escrever o HTML na nova janela
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Transações - {clientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {transactions?.map((transaction) => (
            <div key={transaction.id} className="bg-background p-4 rounded-lg shadow-sm border">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Data:</span>
                <span className="text-sm">
                  {transaction.transaction_date
                    ? format(parseISO(transaction.transaction_date), "dd/MM/yyyy")
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm font-medium">Descrição:</span>
                <span className="text-sm">{transaction.description || "-"}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm font-medium">Valor:</span>
                <span className="text-sm">R$ {Number(transaction.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm font-medium">Mês Referência:</span>
                <span className="text-sm">
                  {transaction.invoice_month
                    ? format(parseISO(transaction.invoice_month), "MM/yyyy")
                    : "-"}
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
              <div className="flex justify-end space-x-2 mt-4">
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
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
