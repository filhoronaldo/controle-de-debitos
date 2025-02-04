import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Receipt } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientDetailsDialog } from "./ClientDetailsDialog";
import { useState } from "react";
import { InvoiceDialog } from "./InvoiceDialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function ClientList() {
  const [selectedClient, setSelectedClient] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const navigate = useNavigate();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          debts:debts(*)
        `)
        .order('name');

      if (error) {
        toast.error('Erro ao carregar clientes');
        throw error;
      }

      return data || [];
    }
  });

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Dia do Vencimento</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients?.map((client) => (
            <TableRow key={client.id}>
              <TableCell>{client.name}</TableCell>
              <TableCell>{client.phone || '-'}</TableCell>
              <TableCell>Todo dia {client.invoice_day || 1}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedClient({
                          id: client.id,
                          name: client.name,
                        });
                        setIsInvoiceOpen(true);
                      }}
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      Ver Fatura
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        navigate(`/client/${client.id}/history`);
                      }}
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      Ver Histórico
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedClient && (
        <InvoiceDialog
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          open={isInvoiceOpen}
          onOpenChange={setIsInvoiceOpen}
        />
      )}
    </div>
  );
}