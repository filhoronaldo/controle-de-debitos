
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
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
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-heading font-bold truncate">
            {transactions?.clientName}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(new Date(), "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y">
          {transactions?.transactions.map((transaction) => {
            const transactionDate = new Date(transaction.created_at);
            const formattedDate = format(transactionDate, "dd 'de' MMMM", { locale: ptBR });
            
            return (
              <div 
                key={transaction.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">
                      {formattedDate}
                    </p>
                    <p className="font-medium truncate">
                      {transaction.description || 'Compra'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.invoice_month ? 
                        format(new Date(transaction.invoice_month), "MMMM/yyyy", { locale: ptBR }) : 
                        '-'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-medium">
                      R$ {Number(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleGeneratePromissoryNote(transaction)}
                    title="Gerar Promissória"
                    className="h-8 w-8 shrink-0"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
