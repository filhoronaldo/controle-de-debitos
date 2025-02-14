
import { Button } from "@/components/ui/button";
import { CreditCard, History, User, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateDebtDialog } from "./CreateDebtDialog";
import { Client } from "@/types/client";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ClientRowProps {
  client: Client;
  onViewInvoice: (clientId: string, clientName: string) => void;
  onViewDetails: (clientId: string, clientName: string) => void;
  onViewHistory: (clientId: string, clientName: string) => void;
}

export function ClientRow({ 
  client,
  onViewInvoice,
  onViewDetails,
  onViewHistory,
}: ClientRowProps) {
  const handleSendInvoice = async () => {
    try {
      if (!client.next_due_date || !client.next_invoice_amount) {
        toast.error("Não há fatura para enviar");
        return;
      }

      const dueDate = format(client.next_due_date, "dd/MM/yyyy");
      const invoiceMonth = format(client.next_due_date, "yyyy-MM-dd");

      // Buscar o telefone do cliente
      const { data: clientData, error: clientError } = await supabase
        .from('lblz_clients')
        .select('phone')
        .eq('id', client.id)
        .single();

      if (clientError || !clientData?.phone) {
        toast.error("Erro ao buscar dados do cliente");
        return;
      }

      // Formatar a mensagem
      const message = `Olá, ${client.name}!\n\n` +
        `Gostaria de lembrá-lo que o nosso combinado para este mês vence no dia *${dueDate}*.\n\n` +
        `Você pode efetuar o pagamento da fatura deste mês no valor de *R$ ${client.next_invoice_amount.toFixed(2)}*. ` +
        `Caso prefira, também tem a opção de quitar um valor maior, contribuindo para reduzir seu débito total, ` +
        `que atualmente está em *R$ ${client.total_debt.toFixed(2)}*.\n\n` +
        `👉 *Opções de Pagamento*:\n` +
        `- Mínimo (Fatura deste mês): R$ ${client.next_invoice_amount.toFixed(2)}\n` +
        `- Total Devido: R$ ${client.total_debt.toFixed(2)}\n\n` +
        `Quanto maior o valor pago, mais próximo você fica de liquidar seu débito total! 😊\n\n` +
        `Caso tenha dúvidas ou precise de ajuda, é só responder essa mensagem aqui no WhatsApp que estamos à disposição!\n\n` +
        `Atenciosamente,\n*Lane&Beleza*`;

      // Enviar mensagem via WhatsApp API
      const response = await fetch("https://evonovo.meusabia.com/message/sendText/detrancaruarushopping", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'd87d8d927b31c4166af041bcf6d14cf0'
        },
        body: JSON.stringify({
          number: clientData.phone.replace(/\D/g, ''), // Remove caracteres não numéricos
          text: message
        })
      });

      if (!response.ok) {
        throw new Error("Erro ao enviar mensagem");
      }

      // Atualizar o registro do último envio
      const { error: updateError } = await supabase
        .from('lblz_clients')
        .update({
          last_invoice_sent_at: new Date().toISOString(),
          last_invoice_sent_month: invoiceMonth
        })
        .eq('id', client.id);

      if (updateError) throw updateError;

      toast.success("Fatura enviada com sucesso!");
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error("Erro ao enviar fatura");
    }
  };

  const getStatusBadge = (status: Client['status']) => {
    switch (status) {
      case 'atrasado':
        return <Badge variant="destructive">Atrasado</Badge>;
      case 'atrasado_parcial':
        return (
          <Badge 
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            Atrasado - Parcial
          </Badge>
        );
      case 'pendente':
        return (
          <Badge 
            className="bg-sky-500 hover:bg-sky-600 text-white"
          >
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="success">Em dia</Badge>;
    }
  };

  const getDueInfo = () => {
    if (!client.days_until_due || !client.next_invoice_amount) return null;

    let colorClass = "text-green-600";
    if (client.days_until_due <= 3) {
      colorClass = "text-red-600";
    } else if (client.days_until_due <= 7) {
      colorClass = "text-orange-500";
    }

    const lastInvoiceInfo = client.last_invoice_sent_month ? (
      <span className="text-gray-500 ml-2">
        (Última fatura: {format(new Date(client.last_invoice_sent_month), "MMM/yy", { locale: ptBR })})
      </span>
    ) : null;

    return (
      <div className="flex items-center gap-2">
        <div className={`text-xs ${colorClass}`}>
          {client.days_until_due === 0 ? (
            "Vence hoje"
          ) : client.days_until_due === 1 ? (
            "Vence amanhã"
          ) : (
            `Vence em ${client.days_until_due} dias`
          )}
          {client.next_invoice_amount > 0 && (
            <span className="ml-2">
              (R$ {client.next_invoice_amount.toFixed(2)})
            </span>
          )}
        </div>
        {lastInvoiceInfo}
      </div>
    );
  };

  return (
    <div className="p-4 border-b last:border-b-0">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{client.name}</p>
            {getDueInfo()}
          </div>
          <p className="text-sm text-muted-foreground">R$ {client.total_debt.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendInvoice}
            className="h-8"
            disabled={!client.next_invoice_amount}
          >
            <Send className="h-4 w-4 mr-1" />
            Enviar Fatura
          </Button>
          {getStatusBadge(client.status)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <CreateDebtDialog clientId={client.id} clientName={client.name} />
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onViewInvoice(client.id, client.name)}
          className="w-full"
        >
          <CreditCard className="h-4 w-4 mr-1" />
          Faturas
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onViewDetails(client.id, client.name)}
          className="w-full"
        >
          <User className="h-4 w-4 mr-1" />
          Detalhes
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onViewHistory(client.id, client.name)}
          className="w-full"
        >
          <History className="h-4 w-4 mr-1" />
          Histórico
        </Button>
      </div>
    </div>
  );
}
