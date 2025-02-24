
import { DashboardCard } from "@/components/DashboardCard";
import { ClientList } from "@/components/ClientList";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, Receipt, User, AlertTriangle } from "lucide-react";
import { CreateClientDialog } from "@/components/CreateClientDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { SalesReportDialog } from "@/components/SalesReportDialog";

const Index = () => {
  const isMobile = useIsMobile();

  const { data: totalDebt } = useQuery({
    queryKey: ['total-debt'],
    queryFn: async () => {
      const { data: debts, error: debtsError } = await supabase
        .from('lblz_debts')
        .select('amount');
      
      if (debtsError) throw debtsError;

      const { data: payments, error: paymentsError } = await supabase
        .from('lblz_payments')
        .select('amount');
      
      if (paymentsError) throw paymentsError;

      const totalDebts = debts.reduce((sum, debt) => sum + Number(debt.amount), 0);
      const totalPayments = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      return totalDebts - totalPayments;
    }
  });

  const { data: totalClients } = useQuery({
    queryKey: ['total-clients'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('lblz_clients')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    }
  });

  const { data: todayPayments } = useQuery({
    queryKey: ['today-payments'],
    queryFn: async () => {
      const today = new Date();
      const { data, error } = await supabase
        .from('lblz_payments')
        .select('amount')
        .gte('payment_date', startOfDay(today).toISOString())
        .lte('payment_date', endOfDay(today).toISOString());
      
      if (error) throw error;

      return data.reduce((sum, payment) => sum + Number(payment.amount), 0);
    }
  });

  // Nova query para buscar clientes com faturas vencendo em 7 dias
  const { data: upcomingInvoices } = useQuery({
    queryKey: ['upcoming-invoices'],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = addDays(today, 7);
      const currentMonth = format(today, 'yyyy-MM');
      
      const { data: clients, error } = await supabase
        .from('lblz_clients')
        .select(`
          id,
          name,
          invoice_day,
          last_invoice_sent_month
        `);

      if (error) throw error;

      // Filtra os clientes que têm vencimento nos próximos 7 dias
      const upcomingDue = clients.filter(client => {
        const dueDay = client.invoice_day || 1;
        const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
        
        // Se já passou do dia do vencimento este mês, considera o próximo mês
        if (today.getDate() > dueDay) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }

        // Verifica se o vencimento é nos próximos 7 dias
        return dueDate <= nextWeek && dueDate >= today;
      });

      // Conta quantos ainda não receberam a fatura
      const notSent = upcomingDue.filter(client => 
        client.last_invoice_sent_month !== currentMonth
      ).length;

      return {
        total: upcomingDue.length,
        notSent
      };
    }
  });

  return (
    <div className="container mx-auto px-2 py-4 space-y-4 animate-fadeIn max-w-full md:max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center gap-3">
        <h1 className="text-xl md:text-3xl font-heading font-bold">Controle de Débitos</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <CreateClientDialog />
          <SalesReportDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <DashboardCard
          title="Total de Débitos"
          value={formatCurrency(totalDebt || 0)}
          icon={<DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
        />
        <DashboardCard
          title="Clientes Ativos"
          value={totalClients || 0}
          icon={<User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
        />
        <DashboardCard
          title="Pagamentos Hoje"
          value={formatCurrency(todayPayments || 0)}
          icon={<CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
        />
        <DashboardCard
          title="Faturas em 7 dias"
          value={`${upcomingInvoices?.total || 0} (${upcomingInvoices?.notSent || 0} não enviadas)`}
          icon={<AlertTriangle className={`h-3 w-3 sm:h-4 sm:w-4 ${upcomingInvoices?.notSent ? 'text-destructive' : 'text-muted-foreground'}`} />}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <h2 className="text-lg md:text-xl font-heading font-semibold">Lista de Clientes</h2>
          {!isMobile && (
            <Button variant="outline" className="w-full md:w-auto">
              <Receipt className="h-4 w-4 mr-2" />
              Exportar Relatório
            </Button>
          )}
        </div>
        <ClientList />
      </div>
    </div>
  );
};

export default Index;
