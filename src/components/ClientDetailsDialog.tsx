import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { Input } from "./ui/input";
import { useToast } from "./ui/use-toast";

interface ClientDetailsDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailsDialog({ clientId, clientName, open, onOpenChange }: ClientDetailsDialogProps) {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const handleEditPhone = () => {
    setNewPhone(client?.phone || "");
    setIsEditingPhone(true);
  };

  const handleSavePhone = async () => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ phone: newPhone })
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: "Telefone atualizado",
        description: "O número de telefone foi atualizado com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      setIsEditingPhone(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o número de telefone.",
      });
    }
  };

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
                <TableCell className="font-medium">Telefone</TableCell>
                <TableCell className="flex items-center gap-2">
                  {isEditingPhone ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="max-w-[200px]"
                      />
                      <Button size="sm" onClick={handleSavePhone}>Salvar</Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditingPhone(false)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <>
                      {client?.phone || '-'}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleEditPhone}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </TableCell>
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