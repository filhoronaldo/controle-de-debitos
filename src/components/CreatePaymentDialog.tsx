import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const paymentFormSchema = z.object({
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que zero"),
  payment_date: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface CreatePaymentDialogProps {
  debtId: string;
  amount: number;
  onPaymentComplete?: () => void;
  trigger?: React.ReactNode;
}

export function CreatePaymentDialog({ debtId, amount, onPaymentComplete, trigger }: CreatePaymentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [invoiceMonth, setInvoiceMonth] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebtDetails = async () => {
      const { data: debt, error } = await supabase
        .from('debts')
        .select('invoice_month')
        .eq('id', debtId)
        .single();

      if (error) {
        console.error('Error fetching debt details:', error);
        return;
      }

      if (debt?.invoice_month) {
        setInvoiceMonth(debt.invoice_month);
      }
    };

    fetchDebtDetails();
  }, [debtId]);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: amount,
      payment_date: new Date().toISOString().split('T')[0],
    },
  });

  const formatCurrency = (value: string) => {
    let numbers = value.replace(/\D/g, "");
    if (!numbers) return "R$ 0,00";
    const amount = parseFloat(numbers) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const parseCurrencyToNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers ? parseFloat(numbers) / 100 : 0;
  };

  const onSubmit = async (data: PaymentFormValues) => {
    try {
      // First, register the payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          debt_id: debtId,
          amount: data.amount,
          payment_date: data.payment_date,
          payment_method: 'manual',
          invoice_month: invoiceMonth,
        });

      if (paymentError) throw paymentError;

      // Then, fetch all debts for this invoice month to update their status
      if (invoiceMonth) {
        const { data: monthDebts, error: debtsError } = await supabase
          .from('debts')
          .select(`
            id,
            amount,
            payments (
              amount
            )
          `)
          .eq('invoice_month', invoiceMonth);

        if (debtsError) throw debtsError;

        // Update status for each debt based on payments
        for (const debt of monthDebts || []) {
          const totalPaid = (debt.payments || []).reduce((sum: number, payment: any) => sum + Number(payment.amount), 0);
          const status = totalPaid >= Number(debt.amount) ? 'paid' : 'pending';

          const { error: updateError } = await supabase
            .from('debts')
            .update({ status })
            .eq('id', debt.id);

          if (updateError) {
            console.error('Error updating debt status:', updateError);
          }
        }
      }

      toast({
        title: "Pagamento registrado com sucesso!",
        description: `Pagamento de ${formatCurrency(data.amount.toString())} registrado`,
      });

      queryClient.invalidateQueries({ queryKey: ['invoice-debts'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      form.reset();
      onPaymentComplete?.();
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Erro ao registrar pagamento",
        description: "Ocorreu um erro ao tentar registrar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            Pagar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="R$ 0,00"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatCurrency(e.target.value);
                        e.target.value = formatted;
                        field.onChange(parseCurrencyToNumber(formatted));
                      }}
                      value={formatCurrency((field.value * 100).toString())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data do Pagamento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Confirmar Pagamento
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}