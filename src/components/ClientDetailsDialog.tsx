import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClientDetailsDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailsDialog({ clientId, clientName, open, onOpenChange }: ClientDetailsDialogProps) {
  const { data: client } = useQuery({
    queryKey: ['client-details', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clientId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes do Cliente - {clientName}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Nome</TableCell>
                <TableCell>{client?.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Email</TableCell>
                <TableCell>{client?.email || '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Telefone</TableCell>
                <TableCell>{client?.phone || '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Data de Cadastro</TableCell>
                <TableCell>
                  {client?.created_at ? new Date(client.created_at).toLocaleDateString('pt-BR') : '-'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}