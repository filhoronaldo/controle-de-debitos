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
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ReactInputMask from "react-input-mask";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  is_whatsapp: z.boolean().default(true),
});

type CreateClientForm = z.infer<typeof formSchema>;

export function CreateClientDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateClientForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_whatsapp: true,
      name: "",
      phone: "",
    },
  });

  const onSubmit = async (data: CreateClientForm) => {
    try {
      // Remove all non-numeric characters from phone before saving
      const phoneNumbers = data.phone.replace(/\D/g, "");

      const { error } = await supabase.from("clients").insert({
        name: data.name,
        phone: phoneNumbers,
        is_whatsapp: data.is_whatsapp,
      });

      if (error) throw error;

      toast({
        title: "Cliente adicionado com sucesso!",
        description: `${data.name} foi cadastrado no sistema.`,
      });

      setOpen(false);
      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar cliente",
        description: "Ocorreu um erro ao tentar adicionar o cliente. Tente novamente.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-success hover:bg-success/90 w-full md:w-auto">
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto w-[95vw] max-w-lg p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Adicionar Novo Cliente</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {/* Campo Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm md:text-base">Nome</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome do cliente"
                      className="text-base md:text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />

            {/* Campo Telefone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm md:text-base">Telefone</FormLabel>
                  <FormControl>
                    <ReactInputMask
                      mask="(99) 99999-9999"
                      className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="(00) 00000-0000"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />

            {/* Campo WhatsApp */}
            <FormField
              control={form.control}
              name="is_whatsapp"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="h-5 w-5"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm md:text-base">
                      Este número é WhatsApp
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Botões de Ação */}
            <div className="flex flex-col md:flex-row justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full md:w-auto text-sm py-3 md:py-2"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full md:w-auto text-sm py-3 md:py-2"
              >
                Adicionar Cliente
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
