import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { UserPlus, Plus, Minus, ArrowLeftRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addMonths, format, parse } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Json } from "@/integrations/supabase/types";
import type { Transaction } from "@/types/transaction";

const productSchema = z.object({
  description: z.string().optional(),
  value: z.coerce.number().min(0.01, "O valor deve ser maior que zero"),
});

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que zero"),
  description: z.string().optional(),
  transaction_date: z.string().min(1, "Data da transação é obrigatória"),
  invoice_month: z.string().min(1, "Mês/Ano da fatura é obrigatório"),
  installments: z.coerce.number().min(1).max(48),
  useInstallments: z.boolean(),
  products: z.array(productSchema).optional(),
});

type CreateClientForm = z.infer<typeof formSchema>;

interface Product {
  description: string;
  value: number;
}

export function CreateDebtDialog({ clientId, clientName }: { clientId: string, clientName: string }) {
  const [open, setOpen] = useState(false);
  const [isProductMode, setIsProductMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([{ description: "", value: 0 }]);
  const { toast } = useToast();

  const form = useForm<CreateClientForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      useInstallments: false,
      amount: 0,
      description: "",
      transaction_date: new Date().toISOString().split('T')[0],
      invoice_month: new Date().toISOString().split('T')[0].substring(0, 7),
      installments: 1,
      products: [],
    },
  });

  const toggleMode = () => {
    setIsProductMode(!isProductMode);
    if (!isProductMode) {
      form.setValue('amount', 0);
      calculateTotalFromProducts();
    } else {
      setProducts([{ description: "", value: 0 }]);
    }
  };

  const addProduct = () => {
    setProducts([...products, { description: "", value: 0 }]);
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      const newProducts = [...products];
      newProducts.splice(index, 1);
      setProducts(newProducts);
      calculateTotalFromProducts(newProducts);
    }
  };

  const updateProduct = (index: number, field: keyof Product, value: string | number) => {
    const newProducts = [...products];
    if (field === 'value') {
      const numericValue = typeof value === 'string' 
        ? Number(value.replace(/[^\d,]/g, '').replace(',', '.')) / 100
        : value;
      newProducts[index][field] = numericValue;
    } else {
      newProducts[index][field] = value as string;
    }
    setProducts(newProducts);
    calculateTotalFromProducts(newProducts);
  };

  const calculateTotalFromProducts = (currentProducts = products) => {
    const total = currentProducts.reduce((sum, product) => sum + (product.value || 0), 0);
    form.setValue('amount', total);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const onSubmit = async (data: CreateClientForm) => {
    try {
      if (isProductMode) {
        const totalAmount = products.reduce((sum, product) => sum + (product.value || 0), 0);
        if (totalAmount <= 0) {
          toast({
            variant: "destructive",
            title: "Erro ao criar débito",
            description: "O valor total dos produtos deve ser maior que zero.",
          });
          return;
        }
        data.amount = totalAmount;
      }

      if (data.useInstallments && data.installments > 1) {
        const installmentAmount = data.amount / data.installments;
        const baseMonth = parse(`${data.invoice_month}-01`, 'yyyy-MM-dd', new Date());
        
        const installmentDebts = Array.from({ length: data.installments }, (_, index) => {
          const installmentMonth = addMonths(baseMonth, index);
          const originalAmountText = `(Origem - ${formatCurrency(data.amount)})`;
          const description = data.description 
            ? `${data.description} ${originalAmountText} (${index + 1}/${data.installments})`
            : `Parcela ${originalAmountText} (${index + 1}/${data.installments})`;
            
          const formattedProducts = isProductMode ? products.map((product, idx) => ({
            description: product.description || `Produto ${idx + 1}`,
            value: product.value
          })) : null;

          return {
            client_id: clientId,
            amount: installmentAmount,
            description,
            transaction_date: data.transaction_date,
            invoice_month: format(installmentMonth, 'yyyy-MM-01'),
            products: formattedProducts,
            status: 'aberta' as const
          };
        });

        const { error } = await supabase
          .from('lblz_debts')
          .insert(installmentDebts);

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        toast({
          title: "Débito parcelado criado com sucesso!",
          description: `${data.installments}x de ${formatCurrency(installmentAmount)} para ${clientName}`,
        });
      } else {
        const formattedProducts = isProductMode ? products.map((product, idx) => ({
          description: product.description || `Produto ${idx + 1}`,
          value: product.value
        })) : null;

        const { error } = await supabase
          .from('lblz_debts')
          .insert({
            client_id: clientId,
            amount: data.amount,
            description: data.description,
            transaction_date: data.transaction_date,
            invoice_month: `${data.invoice_month}-01`,
            products: formattedProducts,
            status: 'aberta' as const
          });

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        toast({
          title: "Débito criado com sucesso!",
          description: `Débito de ${formatCurrency(data.amount)} adicionado para ${clientName}`,
        });
      }

      setOpen(false);
      form.reset();
      setProducts([{ description: "", value: 0 }]);
      setIsProductMode(false);
    } catch (error) {
      console.error('Error creating debt:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar débito",
        description: "Ocorreu um erro ao tentar criar o débito. Tente novamente.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full md:w-auto">
          <UserPlus className="h-4 w-4 mr-1" />
          Incluir Débito
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto w-[95vw] max-w-lg p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Novo Débito para {clientName}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-base">
                  {isProductMode ? "Produtos" : "Valor"}
                </FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleMode}
                  className="ml-2"
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  {isProductMode ? "Modo Valor" : "Modo Produtos"}
                </Button>
              </div>

              {isProductMode ? (
                <div className="space-y-4">
                  {products.map((product, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder={`Produto ${index + 1}`}
                          value={product.description}
                          onChange={(e) => updateProduct(index, 'description', e.target.value)}
                          className="mb-2"
                        />
                        <Input
                          placeholder="R$ 0,00"
                          value={formatCurrency(product.value)}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            updateProduct(index, 'value', value ? parseInt(value) / 100 : 0);
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        {index === products.length - 1 && (
                          <Button
                            type="button"
                            size="icon"
                            onClick={addProduct}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                        {products.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeProduct(index)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="R$ 0,00"
                          inputMode="numeric"
                          className="text-lg md:text-base"
                          onChange={(e) => {
                            let rawValue = e.target.value.replace(/\D/g, "");
                            if (!rawValue) rawValue = "0";
                            const numberValue = parseInt(rawValue) / 100;
                            field.onChange(numberValue);
                            e.target.value = formatCurrency(numberValue);
                          }}
                          value={formatCurrency(field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="useInstallments"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Parcelar</FormLabel>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('useInstallments') && (
                <FormField
                  control={form.control}
                  name="installments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Número de Parcelas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="48"
                          className="text-lg md:text-base"
                          {...field}
                        />
                      </FormControl>
                      {form.watch('amount') > 0 && field.value > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {field.value}x de {formatCurrency(form.watch('amount') / field.value)}
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
                  <FormLabel className="text-base">Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição do débito" 
                      className="min-h-[80px] text-base"
                      {...field} 
                    />
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
                  <FormLabel className="text-base">Data da Transação</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      className="text-lg md:text-base"
                      {...field} 
                    />
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
                  <FormLabel className="text-base">Mês/Ano da Fatura</FormLabel>
                  <FormControl>
                    <Input 
                      type="month" 
                      className="text-lg md:text-base"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full text-base py-6 md:py-4">
              Criar Débito
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
