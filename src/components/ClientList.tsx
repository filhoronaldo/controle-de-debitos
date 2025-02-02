import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, User } from "lucide-react";

interface Client {
  id: number;
  name: string;
  debt: number;
  lastPayment: string;
}

const mockClients: Client[] = [
  { id: 1, name: "João Silva", debt: 1500, lastPayment: "2024-03-15" },
  { id: 2, name: "Maria Santos", debt: 750, lastPayment: "2024-03-20" },
  { id: 3, name: "Pedro Oliveira", debt: 2200, lastPayment: "2024-03-10" },
];

export function ClientList() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Débito Total</TableHead>
            <TableHead>Último Pagamento</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockClients.map((client) => (
            <TableRow key={client.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell>R$ {client.debt.toFixed(2)}</TableCell>
              <TableCell>{new Date(client.lastPayment).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Pagar
                  </Button>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-1" />
                    Detalhes
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}