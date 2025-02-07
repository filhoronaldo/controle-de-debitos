import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreditCard, History, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateDebtDialog } from "./CreateDebtDialog";
import { Client } from "@/types/client";

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

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium">{client.name}</TableCell>
      <TableCell>R$ {client.total_debt.toFixed(2)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {getStatusBadge(client.status)}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <CreateDebtDialog clientId={client.id} clientName={client.name} />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewInvoice(client.id, client.name)}
          >
            <CreditCard className="h-4 w-4 mr-1" />
            Faturas
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewDetails(client.id, client.name)}
          >
            <User className="h-4 w-4 mr-1" />
            Detalhes
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewHistory(client.id, client.name)}
          >
            <History className="h-4 w-4 mr-1" />
            Histórico
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}