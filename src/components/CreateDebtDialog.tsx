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
  amount: z.coerce.number().min(0, "O valor deve ser maior que zero"),
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
        description: `Débito de R$ ${data.amount.toFixed(2)} adicionado para ${clientName}`,
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
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
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