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
import { parse, addMonths, format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Json } from "@/integrations/supabase/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  paymentMethod: z.string().min(1, "Forma de pagamento é obrigatória"),
});

type CreateClientForm = z.infer<typeof formSchema>;

interface Product {
  description: string;
  value: number;
}

const PAYMENT_METHODS = [
  { id: "credito_loja", label: "Crédito Próprio Loja" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "pix", label: "PIX" },
  { id: "cartao_credito", label: "Cartão de Crédito" },
  { id: "cartao_debito", label: "Cartão de Débito" },
] as const;

export function CreateDebtDialog({ clientId, clientName, clientPhone }: { clientId: string, clientName: string, clientPhone: string }) {
  const [open, setOpen] = useState(false);
  const [isProductMode, setIsProductMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([{ description: "", value: 0 }]);
  const { toast } = useToast();

  const today = new Date();
  const localDate = today.toLocaleDateString('en-CA'); // Formato YYYY-MM-DD
  const localMonth = today.toISOString().split('T')[0].substring(0, 7); // Formato YYYY-MM

  const form = useForm<CreateClientForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      useInstallments: false,
      amount: 0,
      description: "",
      transaction_date: localDate,
      invoice_month: localMonth,
      installments: 1,
      paymentMethod: "credito_loja",
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
            title: "Erro ao criar venda",
            description: "O valor total dos produtos deve ser maior que zero.",
          });
          return;
        }

        const formattedProducts = products.map((product, idx) => ({
          description: product.description || `Produto ${idx + 1}`,
          value: product.value
        }));

        const isCredit = data.paymentMethod === "credito_loja";
        const paymentMethodLabel = PAYMENT_METHODS.find(m => m.id === data.paymentMethod)?.label;

        if (isCredit) {
          if (data.useInstallments && data.installments > 1) {
            const installmentAmount = totalAmount / data.installments;
            const baseMonth = parse(`${data.invoice_month}-01`, 'yyyy-MM-dd', new Date());
            
            const installmentDebts = Array.from({ length: data.installments }, (_, index) => {
              const installmentMonth = addMonths(baseMonth, index);
              const originalAmountText = `(Origem - ${formatCurrency(totalAmount)})`;
              const description = data.description 
                ? `${data.description} ${originalAmountText} (${index + 1}/${data.installments})`
                : `Parcela ${originalAmountText} (${index + 1}/${data.installments})`;
                
              return {
                client_id: clientId,
                amount: installmentAmount,
                description,
                transaction_date: data.transaction_date,
                invoice_month: format(installmentMonth, 'yyyy-MM-01'),
                products: formattedProducts as Json,
                status: 'aberta' as const
              };
            });

            const { error: debtError } = await supabase
              .from('lblz_debts')
              .insert(installmentDebts);

            if (debtError) throw debtError;

            toast({
              title: "Venda parcelada criada com sucesso!",
              description: `${data.installments}x de ${formatCurrency(installmentAmount)} para ${clientName}`,
            });

            try {
              const firstPaymentDate = format(parse(`${data.invoice_month}-01`, 'yyyy-MM-dd', new Date()), "dd/MM/yyyy");
              const productsText = formattedProducts
                .map(p => `• ${p.description}: ${formatCurrency(p.value)}`)
                .join("\n");

              const message = `Olá ${clientName}! 🛍️

Muito obrigado pela sua compra! Aqui está o resumo:

*PRODUTOS:*
${productsText}

*TOTAL:* ${formatCurrency(totalAmount)}

Forma de pagamento: ${paymentMethodLabel}
Parcelamento: ${data.installments}x de ${formatCurrency(installmentAmount)}
Vencimento da 1ª parcela: ${firstPaymentDate}

Agradecemos a preferência! 🙏`;

              const response = await fetch("https://evonovo.meusabia.com/message/sendText/detrancaruarushopping", {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': 'd87d8d927b31c4166af041bcf6d14cf0'
                },
                body: JSON.stringify({
                  number: clientPhone.replace(/\D/g, '').startsWith('55') 
                    ? clientPhone.replace(/\D/g, '') 
                    : '55' + clientPhone.replace(/\D/g, ''),
                  text: message
                })
              });

              if (!response.ok) {
                throw new Error("Erro ao enviar mensagem");
              }
            } catch (error) {
              console.error('Error sending WhatsApp message:', error);
            }
          } else {
            const debtData = {
              client_id: clientId,
              amount: totalAmount,
              description: data.description,
              transaction_date: data.transaction_date,
              invoice_month: `${data.invoice_month}-01`,
              products: formattedProducts as Json,
              status: 'aberta' as const
            };

            const { data: insertedDebt, error: debtError } = await supabase
              .from('lblz_debts')
              .insert(debtData)
              .select()
              .single();

            if (debtError) throw debtError;

            const { error: saleError } = await supabase
              .from('lblz_sales')
              .insert({
                client_id: clientId,
                total_amount: totalAmount,
                products: formattedProducts,
                payment_method: paymentMethodLabel,
                debt_id: insertedDebt.id
              });

            if (saleError) throw saleError;

            toast({
              title: "Venda criada com sucesso!",
              description: `Venda de ${formatCurrency(totalAmount)} registrada para ${clientName}`,
            });

            try {
              const productsText = formattedProducts
                .map(p => `• ${p.description}: ${formatCurrency(p.value)}`)
                .join("\n");

              const vencimento = format(parse(`${data.invoice_month}-01`, 'yyyy-MM-dd', new Date()), "dd/MM/yyyy");
              
              const message = `Olá ${clientName}! 🛍️

Muito obrigado pela sua compra! Aqui está o resumo:

*PRODUTOS:*
${productsText}

*TOTAL:* ${formatCurrency(totalAmount)}

Forma de pagamento: ${paymentMethodLabel}
Data de vencimento: ${vencimento}

Agradecemos a preferência! 🙏`;

              const response = await fetch("https://evonovo.meusabia.com/message/sendText/detrancaruarushopping", {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': 'd87d8d927b31c4166af041bcf6d14cf0'
                },
                body: JSON.stringify({
                  number: clientPhone.replace(/\D/g, '').startsWith('55') 
                    ? clientPhone.replace(/\D/g, '') 
                    : '55' + clientPhone.replace(/\D/g, ''),
                  text: message
                })
              });

              if (!response.ok) {
                throw new Error("Erro ao enviar mensagem");
              }
            } catch (error) {
              console.error('Error sending WhatsApp message:', error);
            }
          }
        } else {
          const { error: saleError } = await supabase
            .from('lblz_sales')
            .insert({
              client_id: clientId,
              total_amount: totalAmount,
              products: formattedProducts,
              payment_method: paymentMethodLabel
            });

          if (saleError) throw saleError;

          toast({
            title: "Venda criada com sucesso!",
            description: `Venda de ${formatCurrency(totalAmount)} registrada para ${clientName}`,
          });

          try {
            const productsText = formattedProducts
              .map(p => `• ${p.description}: ${formatCurrency(p.value)}`)
              .join("\n");

            const message = `Olá ${clientName}! 🛍️

Muito obrigado pela sua compra! Aqui está o resumo:

*PRODUTOS:*
${productsText}

*TOTAL:* ${formatCurrency(totalAmount)}

Forma de pagamento: ${paymentMethodLabel}

Agradecemos a preferência! 🙏`;

            const response = await fetch("https://evonovo.meusabia.com/message/sendText/detrancaruarushopping", {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': 'd87d8d927b31c4166af041bcf6d14cf0'
              },
              body: JSON.stringify({
                number: clientPhone.replace(/\D/g, '').startsWith('55') 
                  ? clientPhone.replace(/\D/g, '') 
                  : '55' + clientPhone.replace(/\D/g, ''),
                text: message
              })
            });

            if (!response.ok) {
              throw new Error("Erro ao enviar mensagem");
            }
          } catch (error) {
            console.error('Error sending WhatsApp message:', error);
          }
        }
      } else {
        if (data.useInstallments && data.installments > 1) {
          const installmentAmount = data.amount / data.installments;
          const baseMonth = parse(`${data.invoice_month}-01`, 'yyyy-MM-dd', new Date());
          
          const installmentDebts = Array.from({ length: data.installments }, (_, index) => {
            const installmentMonth = addMonths(baseMonth, index);
            const originalAmountText = `(Origem - ${formatCurrency(data.amount)})`;
            const description = data.description 
              ? `${data.description} ${originalAmountText} (${index + 1}/${data.installments})`
              : `Parcela ${originalAmountText} (${index + 1}/${data.installments})`;
              
            return {
              client_id: clientId,
              amount: installmentAmount,
              description,
              transaction_date: data.transaction_date,
              invoice_month: format(installmentMonth, 'yyyy-MM-01'),
              status: 'aberta' as const
            };
          });

          const { error } = await supabase
            .from('lblz_debts')
            .insert(installmentDebts);

          if (error) throw error;

          toast({
            title: "Débito parcelado criado com sucesso!",
            description: `${data.installments}x de ${formatCurrency(installmentAmount)} para ${clientName}`,
          });
        } else {
          const { error } = await supabase
            .from('lblz_debts')
            .insert({
              client_id: clientId,
              amount: data.amount,
              description: data.description,
              transaction_date: data.transaction_date,
              invoice_month: `${data.invoice_month}-01`,
              status: 'aberta'
            });

          if (error) throw error;

          toast({
            title: "Débito criado com sucesso!",
            description: `Débito de ${formatCurrency(data.amount)} adicionado para ${clientName}`,
          });
        }
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
                  <div className="mt-4 text-right font-medium">
                    Total: {formatCurrency(form.watch('amount'))}
                  </div>
                </div>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="R$ 0,00"
                            value={formatCurrency(field.value)}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              field.onChange(value ? parseInt(value) / 100 : 0);
                            }}
                            className="text-lg md:text-base"
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
                </>
              )}

              {isProductMode && (
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Forma de Pagamento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a forma de pagamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isProductMode && form.watch('paymentMethod') === 'credito_loja' && (
                <>
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
                </>
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

            {(form.watch('paymentMethod') === 'credito_loja' || !isProductMode) && (
              <>
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
              </>
            )}

            <Button type="submit" className="w-full text-base py-6 md:py-4">
              {isProductMode ? "Criar Venda" : "Criar Débito"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
