import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatePaymentDialogProps {
  debtId: string;
  amount: number;
  onPaymentComplete?: () => void;
  trigger?: React.ReactNode;
}

export function CreatePaymentDialog({ debtId, amount, onPaymentComplete, trigger }: CreatePaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(amount.toString());
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: debtDetails, isLoading: isLoadingDebt } = useQuery({
    queryKey: ['debt-details', debtId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lblz_debts')
        .select('invoice_month')
        .eq('id', debtId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching debt details:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Débito não encontrado');
      }

      return data;
    }
  });

  const createPayment = useMutation({
    mutationFn: async () => {
      if (!debtDetails?.invoice_month) {
        throw new Error('Mês de referência não encontrado');
      }

      const { error } = await supabase
        .from('lblz_payments')
        .insert({
          debt_id: debtId,
          amount: Number(paymentAmount),
          payment_method: paymentMethod,
          invoice_month: debtDetails.invoice_month
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-debts'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setOpen(false);
      toast.success('Pagamento registrado com sucesso!');
      onPaymentComplete?.();
    },
    onError: (error) => {
      console.error('Error creating payment:', error);
      toast.error('Erro ao registrar pagamento');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPayment.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Registrar Pagamento</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>
        {isLoadingDebt ? (
          <div>Carregando...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Método de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={createPayment.isPending}>
              {createPayment.isPending ? 'Registrando...' : 'Registrar Pagamento'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
