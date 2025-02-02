import { DashboardCard } from "@/components/DashboardCard";
import { ClientList } from "@/components/ClientList";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, Receipt, User } from "lucide-react";
import { CreateClientDialog } from "@/components/CreateClientDialog";

const Index = () => {
  return (
    <div className="container mx-auto p-6 space-y-8 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">Controle de Débitos</h1>
        <CreateClientDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total de Débitos"
          value="R$ 4.450,00"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <DashboardCard
          title="Clientes Ativos"
          value="3"
          icon={<User className="h-4 w-4 text-muted-foreground" />}
        />
        <DashboardCard
          title="Pagamentos Hoje"
          value="R$ 750,00"
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
        />
        <DashboardCard
          title="Faturas em Aberto"
          value="5"
          icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-heading font-semibold">Lista de Clientes</h2>
          <Button variant="outline">
            <Receipt className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
        <ClientList />
      </div>
    </div>
  );
};

export default Index;