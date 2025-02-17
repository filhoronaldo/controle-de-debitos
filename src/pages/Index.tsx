// Index.tsx

import { DashboardCard } from "@/components/DashboardCard";
import { ClientList } from "@/components/ClientList";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, User } from "lucide-react";
import { CreateClientDialog } from "@/components/CreateClientDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const isMobile = useIsMobile();

  // Query para calcular o total de débitos
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

  // Query para contar o número de clientes ativos
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

  // Query para calcular os pagamentos de hoje
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
    <div className="container mx-auto px-4 py-6 space-y-4 animate-fadeIn max-w-full md:max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-lg md:text-xl font-bold text-primary flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Controle de Débitos
        </h1>
        <CreateClientDialog />
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <DashboardCard
          title="Débitos"
          value={totalDebt || 0}
          isPositive={false}
        />
        <DashboardCard
          title="Clientes"
          value={totalClients || 0}
          isPositive={true}
        />
        <DashboardCard
          title="Hoje"
          value={todayPayments || 0}
          isPositive={true}
        />
      </div>

      {/* Client List Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-base md:text-lg font-semibold">Lista de Clientes</h2>
          {!isMobile && (
            <Button
              variant="outline"
              className="w-full md:w-auto mx-auto md:mx-0 text-xs md:text-sm"
            >
              <Receipt className="h-3 w-3 mr-1 md:mr-2" />
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
