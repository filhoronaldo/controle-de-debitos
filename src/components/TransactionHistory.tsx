
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
          .from('clients')
          .select('name, document, address, invoice_day')
          .eq('name', clientName)
          .single();
        
        if (data) {
          setClientDetails(data);
        }
      }
    };

    fetchClientDetails();
  }, [clientName, transactions]);

  const handleGeneratePromissoryNote = (transaction: Transaction) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Extrair informação de parcelamento da descrição
    const getInstallmentInfo = (description: string | null): { current: number; total: number } => {
      if (!description) return { current: 1, total: 1 };
      
      const match = description.match(/\((\d+)\/(\d+)\)$/);
      if (!match) return { current: 1, total: 1 };
      
      return {
        current: parseInt(match[1], 10),
        total: parseInt(match[2], 10)
      };
    };

    const installmentInfo = getInstallmentInfo(transaction.description);

    // Formatar o valor por extenso (simplificado para exemplo)
    const formatMoneyInWords = (value: number) => {
      const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      });
      
      // Função auxiliar para converter números em palavras
      const numberToWords = (num: number): string => {
        const units = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
        const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
        const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
        
        if (num < 10) return units[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) {
          const digit = num % 10;
          const ten = Math.floor(num / 10);
          return digit === 0 ? tens[ten] : `${tens[ten]} e ${units[digit]}`;
        }
        return num.toString();
      };

      const [reais, centavos] = formatter.format(value)
        .replace('R$', '')
        .trim()
        .split(',')
        .map(part => parseInt(part.replace(/\D/g, '')));

      const reaisText = numberToWords(reais);
      const centavosText = numberToWords(centavos);

      return `${reaisText} reais e ${centavosText} centavos`;
    };

    // Formatar o dia por extenso
    const numberToWords = (num: number): string => {
      const units = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
      const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
      const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
      
      if (num < 10) return units[num];
      if (num < 20) return teens[num - 10];
      if (num < 100) {
        const digit = num % 10;
        const ten = Math.floor(num / 10);
        return digit === 0 ? tens[ten] : `${tens[ten]} e ${units[digit]}`;
      }
      return num.toString();
    };

    // Formatar a data por extenso
    const formatDateInWords = (date: string) => {
      const d = parseISO(date);
      const month = format(d, 'MMMM', { locale: ptBR });
      const year = format(d, 'yyyy');
      const invoiceDay = clientDetails?.invoice_day || 1;
      const dayInWords = numberToWords(invoiceDay);
      
      return `${dayInWords} de ${month} de ${year}`;
    };

    // HTML da promissória
    const html = `
      <html>
        <head>
          <title>Nota Promissória</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              margin-bottom: 20px;
              padding-bottom: 10px;
            }
            .title {
              text-align: center;
              font-weight: bold;
              margin: 20px 0;
            }
            .value {
              text-align: right;
              margin: 20px 0;
              font-weight: bold;
            }
            .content {
              line-height: 1.6;
              margin: 20px 0;
            }
            .signature {
              margin-top: 100px;
              text-align: center;
              border-top: 1px solid #000;
              padding-top: 10px;
            }
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            REPÚBLICA FEDERATIVA DO BRASIL
          </div>
          <div class="title">
            NOTA PROMISSÓRIA Nº ${installmentInfo.current}/${installmentInfo.total}
          </div>
          <div class="value">
            Valor R$ ${transaction.amount}
          </div>
          <div class="content">
            <p>No dia ${formatDateInWords(transaction.invoice_month || new Date().toISOString())} pagaremos por esta única via de NOTA PROMISSÓRIA 
            a CLAUDELANE MARIA DA SILVA 10707874424 CNPJ 27.031.139/0001-59 ou à sua ordem a quantia de ${formatMoneyInWords(Number(transaction.amount))} 
            em moeda corrente deste país.</p>
            
            <p>Pagável em CARUARU</p>
            
            <p>Emitente: ${clientDetails?.name || '_____________________________'}<br>
            CPF/CNPJ: ${clientDetails?.document || '_____________________________'}<br>
            Endereço: ${clientDetails?.address || '_____________________________'}</p>
          </div>
          <div class="signature">
            Assinatura do Emitente
          </div>
          <button class="no-print" onclick="window.print()">Imprimir</button>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl md:w-full p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Histórico de Transações - {clientName}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <div className="rounded-md border overflow-x-auto max-h-[70vh] md:max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base md:text-sm">Data</TableHead>
                  <TableHead className="text-base md:text-sm">Descrição</TableHead>
                  <TableHead className="text-base md:text-sm">Valor</TableHead>
                  <TableHead className="text-base md:text-sm">Mês Referência</TableHead>
                  <TableHead className="text-base md:text-sm">Status</TableHead>
                  <TableHead className="text-base md:text-sm">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-base md:text-sm">
                      {transaction.transaction_date ? 
                        format(parseISO(transaction.transaction_date), 'dd/MM/yyyy') : 
                        '-'
                      }
                    </TableCell>
                    <TableCell className="text-base md:text-sm whitespace-normal">{transaction.description || '-'}</TableCell>
                    <TableCell className="text-base md:text-sm">R$ {Number(transaction.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-base md:text-sm">
                      {transaction.invoice_month ? 
                        format(parseISO(transaction.invoice_month), 'MM/yyyy') : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.status === 'paga' ? 'success' :
                          transaction.status === 'parcial' ? 'warning' :
                          'secondary'
                        }
                        className="text-base md:text-sm"
                      >
                        {transaction.status === 'paga' ? 'Pago' :
                         transaction.status === 'parcial' ? 'Parcial' :
                         'Em Aberto'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleGeneratePromissoryNote(transaction)}
                          title="Gerar Promissória"
                        >
                          <FileText className="h-5 w-5 md:h-4 md:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteTransaction(transaction.id)}
                          className="text-destructive hover:text-destructive/90"
                        >
                          <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
