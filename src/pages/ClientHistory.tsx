
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    <div className="flex flex-col h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background p-4 border-b">
        <h1 className="text-xl font-heading font-bold truncate">
          {transactions?.clientName}
        </h1>
        <p className="text-sm text-muted-foreground">Histórico de Transações</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {transactions?.transactions.map((transaction) => (
            <div 
              key={transaction.id}
              className="bg-card rounded-lg shadow-sm border p-3 flex flex-col gap-2 w-full"
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    {format(new Date(transaction.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground break-words">
                    {transaction.description || '-'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleGeneratePromissoryNote(transaction)}
                  title="Gerar Promissória"
                  className="h-8 w-8 shrink-0 ml-2"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="w-full">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-medium">
                    R$ {Number(transaction.amount).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mês Fatura:</span>
                  <span>
                    {transaction.invoice_month ? 
                      format(new Date(transaction.invoice_month), "MMMM/yyyy", { locale: ptBR }) : 
                      '-'
                    }
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
