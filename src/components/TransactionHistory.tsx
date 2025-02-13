import { Button } from "@/components/ui/button";
import { FileText, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Transaction } from "@/types/transaction";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface TransactionHistoryProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[] | undefined;
  clientName: string;
  onDeleteTransaction: (transactionId: string) => void;
}

interface ClientDetails {
  name: string;
  document: string | null;
  address: string | null;
  invoice_day: number;
}

export function TransactionHistory({
  isOpen,
  onOpenChange,
  transactions,
  clientName,
  onDeleteTransaction,
}: TransactionHistoryProps) {
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  useEffect(() => {
    const fetchClientDetails = async () => {
      if (transactions && transactions.length > 0) {
        const { data } = await supabase
          .from("lblz_clients")
          .select("name, document, address, invoice_day")
          .eq("name", clientName)
          .single();
        if (data) {
          setClientDetails(data as ClientDetails);
        }
      }
    };
    fetchClientDetails();
  }, [clientName, transactions]);

  const handleGeneratePromissoryNote = (transaction: Transaction) => {
    // Implementação existente para gerar promissórias...
  };

  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions((prevSelected) =>
      prevSelected.includes(transactionId)
        ? prevSelected.filter((id) => id !== transactionId)
        : [...prevSelected, transactionId]
    );
  };

  const handleDeleteSelectedTransactions = () => {
    selectedTransactions.forEach((id) => onDeleteTransaction(id));
    setSelectedTransactions([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Transações - {clientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {transactions?.length === 0 ? (
            <p>Nenhuma transação encontrada.</p>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteSelectedTransactions}
                  disabled={selectedTransactions.length === 0}
                >
                  Excluir Selecionados ({selectedTransactions.length})
                </Button>
              </div>
              {transactions?.map((transaction) => (
                <div key={transaction.id} className="bg-background p-4 rounded-lg shadow-sm border">
                  <div className="flex justify-between items-center">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Data:</span>
                    <span className="text-sm">
                      {transaction.transaction_date
                        ? format(parseISO(transaction.transaction_date), "dd/MM/yyyy")
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm font-medium">Descrição:</span>
                    <span className="text-sm">{transaction.description || "-"}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm font-medium">Valor:</span>
                    <span className="text-sm">R$ {Number(transaction.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm font-medium">Mês Referência:</span>
                    <span className="text-sm">
                      {transaction.invoice_month
                        ? format(parseISO(transaction.invoice_month), "MM/yyyy")
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge
                      variant={
                        transaction.status === "paga"
                          ? "success"
                          : transaction.status === "parcial"
                          ? "warning"
                          : "destructive"
                      }
                    >
                      {transaction.status === "paga"
                        ? "Pago"
                        : transaction.status === "parcial"
                        ? "Parcial"
                        : "Em Aberto"}
                    </Badge>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGeneratePromissoryNote(transaction)}
                      title="Gerar Promissória"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDeleteTransaction(transaction.id)}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
