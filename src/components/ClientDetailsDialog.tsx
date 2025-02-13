import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, MessageSquare, User, Calendar } from "lucide-react";

interface ClientDetailsDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailsDialog({ clientId, clientName, open, onOpenChange }: ClientDetailsDialogProps) {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingInvoiceDay, setIsEditingInvoiceDay] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newInvoiceDay, setNewInvoiceDay] = useState<number>(1);
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

  const handleNameEdit = async () => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ name: newName })
        .eq('id', clientId);

      if (error) throw error;

      // Update the cache immediately
      queryClient.setQueryData(['client-details', clientId], (oldData: any) => ({
        ...oldData,
        name: newName
      }));

      // Also update the clients list cache if it exists
      queryClient.setQueryData(['clients'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((client: any) => {
          if (client.id === clientId) {
            return {
              ...client,
              name: newName,
            };
          }
          return client;
        });
      });

      toast.success("Nome atualizado com sucesso");

      // Invalidate both queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsEditingName(false);
    } catch (error) {
      toast.error("Erro ao atualizar nome");
    }
  };

  const handlePhoneEdit = async () => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ phone: newPhone })
        .eq('id', clientId);

      if (error) throw error;

      queryClient.setQueryData(['client-details', clientId], (oldData: any) => ({
        ...oldData,
        phone: newPhone
      }));

      toast.success("Telefone atualizado com sucesso");

      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsEditingPhone(false);
    } catch (error) {
      toast.error("Erro ao atualizar telefone");
    }
  };

  const handleInvoiceDayEdit = async () => {
    if (newInvoiceDay < 1 || newInvoiceDay > 28) {
      toast.error("O dia da fatura deve estar entre 1 e 28");
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({ invoice_day: newInvoiceDay })
        .eq('id', clientId);

      if (error) throw error;

      queryClient.setQueryData(['client-details', clientId], (oldData: any) => ({
        ...oldData,
        invoice_day: newInvoiceDay
      }));

      toast.success("Dia da fatura atualizado com sucesso");

      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsEditingInvoiceDay(false);
    } catch (error) {
      toast.error("Erro ao atualizar dia da fatura");
    }
  };

  const handleWhatsAppToggle = async () => {
    if (!client) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_whatsapp: !client.is_whatsapp })
        .eq('id', clientId);

      if (error) throw error;

      queryClient.setQueryData(['client-details', clientId], (oldData: any) => ({
        ...oldData,
        is_whatsapp: !client.is_whatsapp,
      }));

      queryClient.setQueryData(['clients'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((client: any) => {
          if (client.id === clientId) {
            return {
              ...client,
              is_whatsapp: !client.is_whatsapp,
            };
          }
          return client;
        });
      });

      toast.success(`WhatsApp ${!client.is_whatsapp ? 'ativado' : 'desativado'} com sucesso`);

    } catch (error) {
      toast.error("Erro ao atualizar status do WhatsApp");
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhes do Cliente - {client.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">Nome</div>
            {isEditingName ? (
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Novo nome"
                />
                <Button onClick={handleNameEdit}>Salvar</Button>
                <Button variant="outline" onClick={() => setIsEditingName(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{client.name}</span>
                <Button variant="ghost" size="sm" onClick={() => {
                  setNewName(client.name);
                  setIsEditingName(true);
                }}>
                  Editar
                </Button>
              </div>
            )}
          </div>

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
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleWhatsAppToggle}
                    className={client.is_whatsapp ? "text-green-500 hover:text-green-600" : "text-gray-400 hover:text-gray-500"}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                  <span className={client.is_whatsapp ? "text-green-500" : "text-gray-400"}>
                    {client.is_whatsapp ? "Tem WhatsApp" : "Não tem WhatsApp"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Dia da Fatura</div>
            {isEditingInvoiceDay ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={newInvoiceDay}
                  onChange={(e) => setNewInvoiceDay(parseInt(e.target.value))}
                  placeholder="Dia da fatura (1-28)"
                />
                <Button onClick={handleInvoiceDayEdit}>Salvar</Button>
                <Button variant="outline" onClick={() => setIsEditingInvoiceDay(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Dia {client.invoice_day || 1}</span>
                <Button variant="ghost" size="sm" onClick={() => {
                  setNewInvoiceDay(client.invoice_day || 1);
                  setIsEditingInvoiceDay(true);
                }}>
                  Editar
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
