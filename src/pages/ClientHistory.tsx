
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export default function ClientHistory() {
  const { clientId } = useParams();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['client-history', clientId],
    queryFn: async () => {
      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .single();

      const { data: debts } = await supabase
        .from('debts')
        .select(`
          *,
          payments (*)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      return {
        clientName: client?.name,
        transactions: debts || []
      };
    }
  });

  const handleGeneratePromissoryNote = (transaction: any) => {
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Formatar o valor por extenso (simplificado para exemplo)
    const formatMoneyInWords = (value: number) => {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        .replace('R$', '')
        .trim();
    };

    // Formatar a data por extenso
    const formatDateInWords = (date: string) => {
      const d = new Date(date);
      return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
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
            NOTA PROMISSÓRIA Nº 1/1
          </div>
          <div class="value">
            Valor R$ ${transaction.amount}
          </div>
          <div class="content">
            <p>No dia ${formatDateInWords(transaction.invoice_month)} pagaremos por esta única via de NOTA PROMISSÓRIA 
            a ${transactions?.clientName} ou à sua ordem a quantia de ${formatMoneyInWords(Number(transaction.amount))} 
            em moeda corrente deste país.</p>
            
            <p>Pagável em CARUARU</p>
            
            <p>Emitente: ____________________________<br>
            CPF/CNPJ: ____________________________<br>
            Endereço: ____________________________</p>
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

  if (isLoading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-heading font-bold">
        Histórico de Transações - {transactions?.clientName}
      </h1>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Mês Fatura</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(new Date(transaction.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>{transaction.description || '-'}</TableCell>
                <TableCell>R$ {Number(transaction.amount).toFixed(2)}</TableCell>
                <TableCell>
                  {transaction.invoice_month ? 
                    format(new Date(transaction.invoice_month), "MMMM/yyyy", { locale: ptBR }) : 
                    '-'
                  }
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleGeneratePromissoryNote(transaction)}
                    title="Gerar Promissória"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
