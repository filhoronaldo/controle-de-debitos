
import { Button } from "@/components/ui/button";
import { CreditCard, History, User, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateDebtDialog } from "./CreateDebtDialog";
import { Client } from "@/types/client";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, parseISO, setDate, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

  const handleSendInvoice = async () => {
    try {
      // Primeiro buscar o invoice_day do cliente
      const { data: clientData, error: clientError } = await supabase
        .from('lblz_clients')
        .select('phone, invoice_day')
        .eq('id', client.id)
        .single();

      if (clientError || !clientData?.phone) {
        toast.error("Erro ao buscar dados do cliente");
        return;
      }

      const invoiceDay = clientData.invoice_day || 1;

      // Buscar todas as faturas em aberto do cliente
      const { data: debts, error: debtsError } = await supabase
        .from('lblz_debts')
        .select('*, lblz_payments(amount)')
        .eq('client_id', client.id)
        .eq('status', 'aberta')
        .order('invoice_month', { ascending: true });

      if (debtsError) {
        console.error('Error fetching debts:', debtsError);
        toast.error("Erro ao buscar faturas do cliente");
        return;
      }

      // Agrupar débitos por mês e calcular o total
      const monthlyDebts = debts?.reduce((acc, debt) => {
        if (!debt.invoice_month) return acc;
        
        const month = debt.invoice_month;
        if (!acc[month]) {
          acc[month] = {
            total: 0,
            debts: []
          };
        }
        
        // Calcular total de pagamentos para este débito
        const totalPayments = (debt.lblz_payments || []).reduce((sum, payment) => 
          sum + (payment.amount || 0), 0);
        
        acc[month].total += (debt.amount - totalPayments);
        acc[month].debts.push(debt);
        return acc;
      }, {} as Record<string, { total: number; debts: typeof debts }>) || {};

      // Encontrar o primeiro mês com fatura em aberto e atrasada
      const today = new Date();
      const overdueMonth = Object.entries(monthlyDebts).find(([month]) => {
        const dueDate = setDate(parseISO(month), invoiceDay);
        return isAfter(today, dueDate);
      });

      let message = "";
      
      if (overdueMonth) {
        const [month, data] = overdueMonth;
        const dueDate = format(setDate(parseISO(month), invoiceDay), "dd/MM/yyyy");
        
        message = `Oi, ${client.name}! Tudo certo?\n\n` +
          `Só passando aqui pra te lembrar que o pagamento da sua fatura de R$ ${data.total.toFixed(2)}, ` +
          `que venceu dia *${dueDate}*, ainda não foi feito.\n\n` +
          `Se já pagou, só me avisa pra darmos baixa! Se ainda não conseguiu, me chama pra combinarmos o melhor jeito de acertar.\n\n` +
          `💰 *Opções de Pagamento*:\n` +
          `- Fatura em aberto: R$ ${data.total.toFixed(2)}\n` +
          `- Total devido: R$ ${client.total_debt.toFixed(2)}\n\n` +
          `Qualquer coisa, só mandar mensagem! Tamo junto. 😉\n\n` +
          `*Lane&Beleza*`;
      } else if (client.next_due_date && client.next_invoice_amount) {
        const dueDate = format(client.next_due_date, "dd/MM/yyyy");
        message = `Oi, ${client.name}! Tudo bem? 😊\n\n` +
          `Passando pra te lembrar que nosso combinado deste mês vence dia *${dueDate}*.\n\n` +
          `Você pode pagar a fatura de *R$ ${client.next_invoice_amount.toFixed(2)}* ` +
          `ou, se quiser, antecipar um valor maior e já diminuir o total pendente, ` +
          `que hoje está em *R$ ${client.total_debt.toFixed(2)}*.\n\n` +
          `👉 *Opções de Pagamento*:\n` +
          `- Mínimo (Fatura deste mês): R$ ${client.next_invoice_amount.toFixed(2)}\n` +
          `- Total Devido: R$ ${client.total_debt.toFixed(2)}\n\n` +
          `Quanto maior o valor pago, mais próximo você fica de liquidar seu débito total! 😊\n\n` +
          `Caso tenha dúvidas ou precise de ajuda, é só responder essa mensagem aqui no WhatsApp que estamos à disposição!\n\n` +
          `Atenciosamente,\n*Lane&Beleza*`;
      } else {
        toast.error("Não há fatura para enviar");
        return;
      }

      // Garantir que o mês seja sempre o primeiro dia do mês
      const invoiceMonth = overdueMonth 
        ? startOfMonth(parseISO(overdueMonth[0])).toISOString().split('T')[0]
        : startOfMonth(client.next_due_date!).toISOString().split('T')[0];

      const response = await fetch("https://evonovo.meusabia.com/message/sendText/detrancaruarushopping", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'd87d8d927b31c4166af041bcf6d14cf0'
        },
        body: JSON.stringify({
          number: clientData.phone.replace(/\D/g, ''),
          text: message
        })
      });

      if (!response.ok) {
        throw new Error("Erro ao enviar mensagem");
      }

      const { error: updateError } = await supabase
        .from('lblz_clients')
        .update({
          last_invoice_sent_at: new Date().toISOString(),
          last_invoice_sent_month: invoiceMonth
        })
        .eq('id', client.id);

      if (updateError) throw updateError;

      await queryClient.invalidateQueries({ queryKey: ['clients'] });
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
    // Não retornar null se tivermos fatura atrasada, mesmo sem fatura futura
    if (!client.next_invoice_amount && client.status !== 'atrasado' && client.status !== 'atrasado_parcial') {
      return null;
    }

    let colorClass = "text-green-600";
    let dueText = "";
    let amount = client.next_invoice_amount || 0;

    if (client.status === 'atrasado' || client.status === 'atrasado_parcial') {
      colorClass = "text-red-600";
      // Buscar o valor da fatura vencida
      const overdueAmount = client.total_debt - (client.next_invoice_amount || 0);
      amount = overdueAmount;
      
      const daysOverdue = Math.abs(client.days_until_due || 0);
      dueText = daysOverdue === 1 
        ? "Vencido há 1 dia" 
        : `Vencido há ${daysOverdue} dias`;
    } else if (client.days_until_due !== undefined) {
      if (client.days_until_due <= 3) {
        colorClass = "text-red-600";
      } else if (client.days_until_due <= 7) {
        colorClass = "text-orange-500";
      }

      dueText = client.days_until_due === 0 
        ? "Vence hoje"
        : client.days_until_due === 1 
        ? "Vence amanhã"
        : `Vence em ${client.days_until_due} dias`;
    }

    const lastInvoiceInfo = client.last_invoice_sent_month ? (
      <span className="text-gray-500 ml-2">
        (Última fatura: {format(startOfMonth(parseISO(client.last_invoice_sent_month)), "MMM/yy", { locale: ptBR })})
      </span>
    ) : null;

    return (
      <div className="flex items-center gap-2">
        <div className={`text-xs ${colorClass}`}>
          {dueText}
          {amount > 0 && (
            <span className="ml-2">
              (R$ {amount.toFixed(2)})
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
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">R$ {client.total_debt.toFixed(2)}</p>
            {getStatusBadge(client.status)}
          </div>
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendInvoice}
            className="h-8"
            disabled={!client.next_invoice_amount && client.status !== 'atrasado' && client.status !== 'atrasado_parcial'}
          >
            <Send className="h-4 w-4 mr-1" />
            Enviar Fatura
          </Button>
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
