
import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export function SalesReportDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales-report'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lblz_sales')
        .select(`
          *,
          lblz_clients (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const deleteSale = useMutation({
    mutationFn: async (saleId: string) => {
      // Verificar se existem pagamentos associados a qualquer débito desta venda
      const { data: debts } = await supabase
        .from('lblz_debts')
        .select('id')
        .eq('sale_id', saleId);

      if (debts && debts.length > 0) {
        const debtIds = debts.map(d => d.id);
        
        const { data: payments } = await supabase
          .from('lblz_payments')
          .select('id')
          .in('debt_id', debtIds);

        if (payments && payments.length > 0) {
          throw new Error("Não é possível excluir uma venda que possui pagamentos registrados.");
        }
      }

      // Como temos ON DELETE CASCADE na coluna sale_id de lblz_debts,
      // ao excluir a venda, todos os débitos relacionados serão excluídos automaticamente
      const { error: saleError } = await supabase
        .from('lblz_sales')
        .delete()
        .eq('id', saleId);

      if (saleError) throw saleError;
    },
    onSuccess: () => {
      toast.success("Venda excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['sales-report'] });
      queryClient.invalidateQueries({ queryKey: ['total-debt'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao excluir venda");
    }
  });

  const handleDeleteSale = async (saleId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.")) {
      deleteSale.mutate(saleId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full md:w-auto">
          <FileText className="h-4 w-4 mr-2" />
          Relatório de Vendas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório de Vendas</DialogTitle>
          <DialogDescription>
            Listagem de todas as vendas realizadas
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-4">Carregando...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma de Pagamento</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales?.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    {format(parseISO(sale.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>{sale.lblz_clients?.name}</TableCell>
                  <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                  <TableCell>{sale.payment_method}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {(sale.products as { description: string, value: number }[])
                      .map(p => p.description)
                      .join(", ")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSale(sale.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
