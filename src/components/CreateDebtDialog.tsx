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
import { PlusCircle } from "lucide-react";
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
    },
  });

  const formatCurrency = (value: string) => {
    // Remove non-digit characters
    let number = value.replace(/\D/g, "");
    
    // Convert to decimal (divide by 100 to handle cents)
    const decimal = parseFloat(number) / 100;
    
    // Format as Brazilian Real
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(decimal);
  };

  const parseCurrencyToNumber = (value: string) => {
    // Remove currency symbol, dots and convert comma to dot
    return Number(value.replace(/[R$\s.]/g, '').replace(',', '.'));
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
                        const formatted = formatCurrency(e.target.value);
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
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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