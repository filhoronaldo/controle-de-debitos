import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Phone, MessageSquare } from "lucide-react";

interface ClientDetailsDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailsDialog({ clientId, clientName, open, onOpenChange }: ClientDetailsDialogProps) {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
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
    enabled: open
  });

  const handlePhoneEdit = async () => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ phone: newPhone })
        .eq('id', clientId);

      if (error) throw error;

      // Update the cache immediately
      queryClient.setQueryData(['client-details', clientId], (oldData: any) => ({
        ...oldData,
        phone: newPhone
      }));

      toast({
        title: "Telefone atualizado",
        description: "O número de telefone foi atualizado com sucesso.",
      });

      // Invalidate both queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsEditingPhone(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar telefone",
        description: "Ocorreu um erro ao atualizar o número de telefone.",
      });
    }
  };

  const handleWhatsAppToggle = async (newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_whatsapp: newStatus })
        .eq('id', clientId);

      if (error) throw error;

      // Update the cache immediately
      queryClient.setQueryData(['client-details', clientId], (oldData: any) => ({
        ...oldData,
        is_whatsapp: newStatus,
      }));

      // Also update the clients list cache if it exists
      queryClient.setQueryData(['clients'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((client: any) => {
          if (client.id === clientId) {
            return {
              ...client,
              is_whatsapp: newStatus,
            };
          }
          return client;
        });
      });

      toast({
        title: `WhatsApp ${newStatus ? 'ativado' : 'desativado'}`,
        description: `O WhatsApp foi ${newStatus ? 'ativado' : 'desativado'} para este cliente.`,
      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar WhatsApp",
        description: "Ocorreu um erro ao atualizar o status do WhatsApp.",
      });
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhes do Cliente - {clientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Telefone</div>
              {isEditingPhone ? (
                <div className="flex gap-2">
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Novo telefone"
                  />
                  <Button onClick={handlePhoneEdit}>Salvar</Button>
                  <Button variant="outline" onClick={() => setIsEditingPhone(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{client.phone || "Não cadastrado"}</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setNewPhone(client.phone || "");
                    setIsEditingPhone(true);
                  }}>
                    Editar
                  </Button>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleWhatsAppToggle(!client.is_whatsapp)}
              className={client.is_whatsapp ? "text-green-500 hover:text-green-600" : "text-gray-400 hover:text-gray-500"}
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}