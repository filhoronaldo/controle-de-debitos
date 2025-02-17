
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, MessageSquare, User, Calendar, MapPin, FileText, Building2, Map } from "lucide-react";
import ReactInputMask from "react-input-mask";

interface ClientDetailsDialogProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailsDialog({ clientId, clientName, open, onOpenChange }: ClientDetailsDialogProps) {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [isEditingState, setIsEditingState] = useState(false);
  const [isEditingInvoiceDay, setIsEditingInvoiceDay] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newDocument, setNewDocument] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newInvoiceDay, setNewInvoiceDay] = useState<number>(1);
  const queryClient = useQueryClient();

  const { data: client } = useQuery({
    queryKey: ['client-details', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lblz_clients')
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
        .from('lblz_clients')
        .update({ name: newName })
        .eq('id', clientId);

      if (error) throw error;

      queryClient.setQueryData(['client-details', clientId], (oldData: any) => ({
        ...oldData,
        name: newName
      }));

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

      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsEditingName(false);
    } catch (error) {
      toast.error("Erro ao atualizar nome");
    }
  };

  const handleDocumentEdit = async () => {
    try {
      const { error } = await supabase
        .from('lblz_clients')
        .update({ document: newDocument })
        .eq('id', clientId);

      if (error) throw error;

      queryClient.setQueryData(['client-details', clientId], (oldData: any) => ({
        ...oldData,
        document: newDocument
      }));

      toast.success("CPF atualizado com sucesso");

      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      setIsEditingDocument(false);
    } catch (error) {
      toast.error("Erro ao atualizar CPF");
    }
  };

  const handleAddressEdit = async () => {
    try {
      const { error } = await supabase
        .from('lblz_clients')
        .update({ address: newAddress })
        .eq('id', clientId);

      if (error) throw error;

      queryClient.setQueryData(['client-details', clientId], (oldData: any) => ({
        ...oldData,
        address: newAddress
      }));

      toast.success("Endereço atualizado com sucesso");

      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      setIsEditingAddress(false);
    } catch (error) {
      toast.error("Erro ao atualizar endereço");
    }
  };

  const handleCityEdit = async () => {
    try {
      const { error } = await supabase
        .from('lblz_clients')
        .update({ city: newCity })
        .eq('id', clientId);

      if (error) throw error;

      queryClient.setQueryData(['client-details', clientId], (oldData: any) => ({
        ...oldData,
        city: newCity
      }));

      toast.success("Cidade atualizada com sucesso");

      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      setIsEditingCity(false);
    } catch (error) {
      toast.error("Erro ao atualizar cidade");
    }
  };

  const handleStateEdit = async () => {
    try {
      const { error } = await supabase
        .from('lblz_clients')
        .update({ state: newState.toUpperCase() })
        .eq('id', clientId);

      if (error) throw error;

      queryClient.setQueryData(['client-details', clientId], (oldData: any) => ({
        ...oldData,
        state: newState.toUpperCase()
      }));

      toast.success("Estado atualizado com sucesso");

      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      setIsEditingState(false);
    } catch (error) {
      toast.error("Erro ao atualizar estado");
    }
  };

  const handlePhoneEdit = async () => {
    try {
      const { error } = await supabase
        .from('lblz_clients')
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
        .from('lblz_clients')
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
        .from('lblz_clients')
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
            <div className="text-sm font-medium">CPF</div>
            {isEditingDocument ? (
              <div className="flex gap-2">
                <ReactInputMask
                  mask="999.999.999-99"
                  value={newDocument}
                  onChange={(e) => setNewDocument(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="000.000.000-00"
                />
                <Button onClick={handleDocumentEdit}>Salvar</Button>
                <Button variant="outline" onClick={() => setIsEditingDocument(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{client.document || "Não cadastrado"}</span>
                <Button variant="ghost" size="sm" onClick={() => {
                  setNewDocument(client.document || "");
                  setIsEditingDocument(true);
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
                <ReactInputMask
                  mask="(99) 99999-9999"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="(00) 00000-0000"
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
                    onClick={() => handleWhatsAppToggle()}
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
            <div className="text-sm font-medium">Endereço</div>
            {isEditingAddress ? (
              <div className="flex gap-2">
                <Input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Novo endereço"
                />
                <Button onClick={handleAddressEdit}>Salvar</Button>
                <Button variant="outline" onClick={() => setIsEditingAddress(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{client.address || "Não cadastrado"}</span>
                <Button variant="ghost" size="sm" onClick={() => {
                  setNewAddress(client.address || "");
                  setIsEditingAddress(true);
                }}>
                  Editar
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Cidade</div>
            {isEditingCity ? (
              <div className="flex gap-2">
                <Input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Nova cidade"
                />
                <Button onClick={handleCityEdit}>Salvar</Button>
                <Button variant="outline" onClick={() => setIsEditingCity(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{client.city || "Não cadastrado"}</span>
                <Button variant="ghost" size="sm" onClick={() => {
                  setNewCity(client.city || "");
                  setIsEditingCity(true);
                }}>
                  Editar
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Estado</div>
            {isEditingState ? (
              <div className="flex gap-2">
                <Input
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  placeholder="Novo estado"
                  maxLength={2}
                />
                <Button onClick={handleStateEdit}>Salvar</Button>
                <Button variant="outline" onClick={() => setIsEditingState(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                <span>{client.state || "Não cadastrado"}</span>
                <Button variant="ghost" size="sm" onClick={() => {
                  setNewState(client.state || "");
                  setIsEditingState(true);
                }}>
                  Editar
                </Button>
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
