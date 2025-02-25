
import { DashboardCard } from "@/components/DashboardCard";
import { ClientList } from "@/components/ClientList";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, Package, Receipt, User } from "lucide-react";
import { CreateClientDialog } from "@/components/CreateClientDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { SalesReportDialog } from "@/components/SalesReportDialog";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

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

  return (
    <div className="container mx-auto px-2 py-4 space-y-4 animate-fadeIn max-w-full md:max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center gap-3">
        <h1 className="text-xl md:text-3xl font-heading font-bold">Controle de Débitos</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <CreateClientDialog />
          <SalesReportDialog />
          <Button variant="outline" onClick={() => navigate('/products')}>
            <Package className="h-4 w-4 mr-2" />
            Produtos
          </Button>
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
          title="Faturas em Aberto"
          value="5"
          icon={<Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
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
