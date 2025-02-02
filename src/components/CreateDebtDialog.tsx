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

const debtFormSchema = z.object({
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que zero"),
  description: z.string().optional(),
  transaction_date: z.string().optional(),
  invoice_month: z.string().optional(),
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
      transaction_date: new Date().toISOString().split('T')[0],
      invoice_month: new Date().toISOString().split('T')[0].substring(0, 7),
    },
  });

  const formatCurrency = (value: string) => {
    // Remove qualquer caractere que não seja número
    const numbers = value.replace(/\D/g, "");
    
    // Mantém os zeros à direita
    const paddedNumbers = numbers.padStart(3, "0");
    
    // Converte para número e divide por 100 para ter os centavos
    const amount = parseInt(paddedNumbers, 10) / 100;
    
    // Formata o número como moeda
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const parseCurrencyToNumber = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, "");
    // Mantém os zeros e divide por 100
    return numbers ? parseInt(numbers, 10) / 100 : 0;
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

  const onSubmit = async (data: DebtFormValues) => {
    try {
      const { error } = await supabase
        .from('debts')
        .insert({
          client_id: clientId,
          amount: data.amount,
          description: data.description,
          transaction_date: data.transaction_date,
          invoice_month: data.invoice_month ? `${data.invoice_month}-01` : null,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Débito criado com sucesso!",
        description: `Débito de ${formatCurrency(data.amount.toString())} adicionado para ${clientName}`,
      });

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
                        const rawValue = e.target.value.replace(/[^\d]/g, '');
                        const formatted = formatCurrency(rawValue);
                        e.target.value = formatted;
                        field.onChange(parseCurrencyToNumber(formatted));
                      }}
                      value={formatCurrency(field.value.toString())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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