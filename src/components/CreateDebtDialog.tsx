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
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { addMonths, format } from "date-fns";

const debtFormSchema = z.object({
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que zero"),
  description: z.string().optional(),
  transaction_date: z.string().optional(),
  invoice_month: z.string().optional(),
  installments: z.coerce.number().min(1).max(48),
  useInstallments: z.boolean(),
});

type DebtFormValues = z.infer<typeof debtFormSchema>;

interface CreateDebtDialogProps {
  clientId: string;
  clientName: string;
}

export function CreateDebtDialog({ clientId, clientName }: CreateDebtDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      amount: 0,
      description: "",
      transaction_date: new Date().toLocaleDateString('en-CA'),
      invoice_month: new Date().toISOString().split('T')[0].substring(0, 7),
      installments: 1,
      useInstallments: false,
    },
  });

  const formatCurrency = (value: string | number) => {
    const numberValue = typeof value === 'string' ? parseCurrencyToNumber(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numberValue);
  };

  const parseCurrencyToNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers ? parseFloat(numbers) / 100 : 0;
  };

  const navigateMonth = (direction: 'next' | 'previous') => {
    const currentMonth = form.getValues('invoice_month') || new Date().toISOString().split('T')[0].substring(0, 7);
    const [year, month] = currentMonth.split('-').map(Number);
    
    let newDate = new Date(year, month - 1);
    if (direction === 'next') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    form.setValue('invoice_month', newMonth);
  };

  const calculateInstallmentAmount = (totalAmount: number, installments: number) => {
    if (installments <= 0) return 0;
    const installmentValue = totalAmount / installments;
    return Number(installmentValue.toFixed(2));
  };

  const onSubmit = async (data: DebtFormValues) => {
    try {
      if (data.useInstallments && data.installments > 1) {
        const installmentAmount = calculateInstallmentAmount(data.amount, data.installments);
        const baseMonth = new Date(`${data.invoice_month}-01`);
        
        // Create an array of installment debts
        const installmentDebts = Array.from({ length: data.installments }, (_, index) => {
          const installmentMonth = addMonths(baseMonth, index);
          return {
            client_id: clientId,
            amount: installmentAmount,
            description: `${data.description || 'Parcela'} (${index + 1}/${data.installments})`,
            transaction_date: data.transaction_date,
            invoice_month: format(installmentMonth, 'yyyy-MM-dd'),
          };
        });

        // Insert all installments
        const { error } = await supabase
          .from('debts')
          .insert(installmentDebts);

        if (error) throw error;

        toast({
          title: "Débito parcelado criado com sucesso!",
          description: `${data.installments}x de ${formatCurrency(installmentAmount)} para ${clientName}`,
        });
      } else {
        // Insert single debt
        const { error } = await supabase
          .from('debts')
          .insert({
            client_id: clientId,
            amount: data.amount,
            description: data.description,
            transaction_date: data.transaction_date,
            invoice_month: data.invoice_month ? `${data.invoice_month}-01` : null,
          });

        if (error) throw error;

        toast({
          title: "Débito criado com sucesso!",
          description: `Débito de ${formatCurrency(data.amount)} adicionado para ${clientName}`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['clients'] });
      form.reset();
    } catch (error) {
      console.error('Error creating debt:', error);
      toast({
        title: "Erro ao criar débito",
        description: "Ocorreu um erro ao tentar criar o débito. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const watchAmount = form.watch('amount');
  const watchInstallments = form.watch('installments');
  const watchUseInstallments = form.watch('useInstallments');

  const installmentAmount = calculateInstallmentAmount(watchAmount, watchInstallments);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="h-4 w-4 mr-1" />
          Incluir Débito
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Débito para {clientName}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="R$ 0,00"
                        inputMode="numeric"
                        onChange={(e) => {
                          let rawValue = e.target.value.replace(/\D/g, "");
                          if (!rawValue) rawValue = "0";
                          const formatted = formatCurrency(rawValue);
                          field.onChange(parseCurrencyToNumber(formatted));
                          e.target.value = formatted;
                        }}
                        value={field.value ? formatCurrency((field.value * 100).toFixed(0)) : "R$ 0,00"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="useInstallments"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Parcelar</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchUseInstallments && (
                <FormField
                  control={form.control}
                  name="installments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Parcelas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="48"
                          {...field}
                        />
                      </FormControl>
                      {watchAmount > 0 && watchInstallments > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {watchInstallments}x de {formatCurrency(installmentAmount)}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição do débito" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transaction_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da Transação</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoice_month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês/Ano da Fatura</FormLabel>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => navigateMonth('previous')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <FormControl>
                      <Input type="month" {...field} className="text-center" />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => navigateMonth('next')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Criar Débito
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}