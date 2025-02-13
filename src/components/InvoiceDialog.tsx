
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, setDate, isBefore } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useState, useEffect } from "react"
import { CreatePaymentDialog } from "./CreatePaymentDialog"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface InvoiceDialogProps {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceDialog({ clientId, clientName, open, onOpenChange }: InvoiceDialogProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const queryClient = useQueryClient()

  const { data: invoiceData, refetch } = useQuery({
    queryKey: ["invoice-debts", clientId, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd")
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd")

      const { data: client } = await supabase
        .from("lblz_clients")
        .select("invoice_day")
        .eq("id", clientId)
        .single()

      const { data: debts, error: debtsError } = await supabase
        .from("lblz_debts")
        .select(`
          *,
          lblz_payments (*)
        `)
        .eq("client_id", clientId)
        .gte("invoice_month", startDate)
        .lte("invoice_month", endDate)
        .order("invoice_month", { ascending: true })

      if (debtsError) {
        toast.error("Erro ao carregar faturas")
        throw debtsError
      }

      const transactions = debts.reduce((acc: any[], debt: any) => {
        acc.push({
          id: debt.id,
          date: debt.transaction_date || debt.created_at,
          description: debt.description,
          amount: debt.amount,
          type: "debt",
          invoice_month: debt.invoice_month,
        })

        if (debt.lblz_payments) {
          debt.lblz_payments.forEach((payment: any) => {
            acc.push({
              id: payment.id,
              date: payment.payment_date,
              description: "Pagamento",
              amount: -payment.amount,
              type: "payment",
              payment_method: payment.payment_method,
              invoice_month: payment.invoice_month,
            })
          })
        }

        return acc
      }, [])

      return {
        invoiceDay: client?.invoice_day || 1,
        transactions: transactions.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      }
    },
  })

  const deletePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.from("lblz_payments").delete().eq("id", paymentId)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Pagamento excluído com sucesso")
      queryClient.invalidateQueries({ queryKey: ["invoice-debts", clientId] })
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      queryClient.invalidateQueries({ queryKey: ["total-debt"] })
      queryClient.invalidateQueries({ queryKey: ["today-payments"] })
    },
    onError: () => {
      toast.error("Erro ao excluir pagamento")
    },
  })

  useEffect(() => {
    if (open) {
      refetch()
    }
  }, [open, refetch])

  const calculateTotals = () => {
    if (!invoiceData?.transactions) return { totalAmount: 0, totalPaid: 0, pendingAmount: 0 }

    const totals = invoiceData.transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === "debt") {
          acc.totalAmount += Number(transaction.amount)
        } else if (transaction.type === "payment") {
          acc.totalPaid += Math.abs(Number(transaction.amount))
        }
        return acc
      },
      { totalAmount: 0, totalPaid: 0 },
    )

    return {
      ...totals,
      pendingAmount: totals.totalAmount - totals.totalPaid,
    }
  }

  const getDueDate = () => {
    if (!invoiceData?.invoiceDay) return null
    const dueDate = setDate(currentMonth, invoiceData.invoiceDay)
    return format(dueDate, "dd/MM/yyyy", { locale: ptBR })
  }

  const getInvoiceStatus = () => {
    const { totalAmount, totalPaid } = calculateTotals()
    const dueDate = getDueDate()
    const isPastDue = dueDate
      ? isBefore(
          new Date(parseISO(format(setDate(currentMonth, invoiceData?.invoiceDay || 1), "yyyy-MM-dd"))),
          new Date(),
        )
      : false

    if (totalPaid >= totalAmount) {
      return { label: "Paga", variant: "outline" as const }
    }
    if (isPastDue) {
      if (totalPaid > 0) {
        return { label: "Vencida - Parcial", variant: "destructive" as const }
      }
      return { label: "Vencida", variant: "destructive" as const }
    }
    return { label: "Aberta", variant: "default" as const }
  }

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1))
  }

  const handlePaymentComplete = () => {
    refetch()
    toast.success("Pagamento registrado com sucesso!")
  }

  const handleDeletePayment = (paymentId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este pagamento?")) {
      deletePayment.mutate(paymentId)
    }
  }

  const firstPendingDebtId = invoiceData?.transactions?.find((t) => t.type === "debt")?.id || null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const timezoneOffset = date.getTimezoneOffset() * 60000
    const localDate = new Date(date.getTime() + timezoneOffset)
    return format(localDate, "dd/MM/yyyy")
  }

  const formatMonthYear = (dateString: string | null) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    const timezoneOffset = date.getTimezoneOffset() * 60000
    const localDate = new Date(date.getTime() + timezoneOffset)
    return format(localDate, "MMMM 'de' yyyy", { locale: ptBR })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl md:w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex flex-col gap-4">
            <DialogTitle className="text-lg md:text-xl text-center">Fatura - {clientName}</DialogTitle>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-sm min-w-[120px] text-center">
                {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 flex-grow flex-col overflow-hidden">
          <div className="mb-4 flex flex-col gap-4">
            <div className="space-y-2 w-full">
              <div className="flex justify-center mb-2">
                <Badge variant={getInvoiceStatus().variant}>{getInvoiceStatus().label}</Badge>
              </div>
              <div className="text-sm text-muted-foreground grid grid-cols-1 gap-2 text-center">
                <div>
                  Total Pendente:{" "}
                  <span className="font-medium text-foreground">R$ {calculateTotals().pendingAmount.toFixed(2)}</span>
                </div>
                <div>
                  Total do Mês:{" "}
                  <span className="font-medium text-foreground">R$ {calculateTotals().totalAmount.toFixed(2)}</span>
                </div>
                <div>
                  Total Pago:{" "}
                  <span className="font-medium text-success">R$ {calculateTotals().totalPaid.toFixed(2)}</span>
                </div>
                <div>
                  Vencimento: <span className="font-medium text-foreground">{getDueDate()}</span>
                </div>
              </div>
            </div>
            {firstPendingDebtId && (
              <CreatePaymentDialog
                debtId={firstPendingDebtId}
                amount={calculateTotals().pendingAmount}
                onPaymentComplete={handlePaymentComplete}
                trigger={
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Pagamento
                  </Button>
                }
              />
            )}
          </div>

          <div className="flex-grow overflow-hidden flex flex-col">
            <div className="text-sm font-medium mb-2">Transações</div>
            <div className="rounded-md border overflow-y-auto flex-grow">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs">Valor</TableHead>
                    <TableHead className="text-xs">Mês Ref.</TableHead>
                    <TableHead className="text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceData?.transactions?.map((transaction) => (
                    <TableRow key={transaction.id} className={transaction.type === "payment" ? "bg-muted/30" : ""}>
                      <TableCell className="text-xs">{formatDate(transaction.date)}</TableCell>
                      <TableCell className="text-xs whitespace-normal">{transaction.description}</TableCell>
                      <TableCell className={`text-xs ${transaction.type === "payment" ? "text-success" : ""}`}>
                        R$ {Math.abs(Number(transaction.amount)).toFixed(2)}
                        {transaction.type === "payment" &&
                          transaction.payment_method &&
                          ` (${transaction.payment_method})`}
                      </TableCell>
                      <TableCell className="text-xs">{formatMonthYear(transaction.invoice_month)}</TableCell>
                      <TableCell>
                        {transaction.type === "payment" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePayment(transaction.id)}
                            className="text-destructive hover:text-destructive/90"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!invoiceData?.transactions || invoiceData.transactions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-xs">
                        Nenhuma transação encontrada para este mês
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
