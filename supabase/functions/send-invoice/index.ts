
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const WHATSAPP_API_URL = "https://evonovo.meusabia.com/message/sendText/detrancaruarushopping"
const WHATSAPP_API_KEY = "d87d8d927b31c4166af041bcf6d14cf0"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvoiceRequest {
  clientId: string;
  dueDate: string;
  invoiceAmount: number;
  totalDebt: number;
  invoiceMonth: string;
}

async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    )

    const { clientId, dueDate, invoiceAmount, totalDebt, invoiceMonth } = await req.json() as InvoiceRequest

    // Buscar dados do cliente
    const { data: client, error: clientError } = await supabase
      .from('lblz_clients')
      .select('name, phone')
      .eq('id', clientId)
      .single()

    if (clientError) throw new Error(`Error fetching client: ${clientError.message}`)
    if (!client) throw new Error('Client not found')
    if (!client.phone) throw new Error('Client phone number not found')

    // Formatar a mensagem
    const message = `Olá, ${client.name}!\n\n` +
      `Gostaria de lembrá-lo que o nosso combinado para este mês vence no dia *${dueDate}*.\n\n` +
      `Você pode efetuar o pagamento da fatura deste mês no valor de *R$ ${invoiceAmount.toFixed(2)}*. ` +
      `Caso prefira, também tem a opção de quitar um valor maior, contribuindo para reduzir seu débito total, ` +
      `que atualmente está em *R$ ${totalDebt.toFixed(2)}*.\n\n` +
      `👉 *Opções de Pagamento*:\n` +
      `- Mínimo (Fatura deste mês): R$ ${invoiceAmount.toFixed(2)}\n` +
      `- Total Devido: R$ ${totalDebt.toFixed(2)}\n\n` +
      `Quanto maior o valor pago, mais próximo você fica de liquidar seu débito total! 😊\n\n` +
      `Caso tenha dúvidas ou precise de ajuda, é só responder essa mensagem aqui no WhatsApp que estamos à disposição!\n\n` +
      `Atenciosamente,\n*Lane&Beleza*`

    // Enviar mensagem via WhatsApp API
    const whatsappResponse = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_API_KEY
      },
      body: JSON.stringify({
        number: client.phone.replace(/\D/g, ''), // Remove caracteres não numéricos
        text: message
      })
    })

    if (!whatsappResponse.ok) {
      throw new Error(`WhatsApp API error: ${whatsappResponse.statusText}`)
    }

    // Atualizar o registro do último envio
    const { error: updateError } = await supabase
      .from('lblz_clients')
      .update({
        last_invoice_sent_at: new Date().toISOString(),
        last_invoice_sent_month: invoiceMonth
      })
      .eq('id', clientId)

    if (updateError) throw new Error(`Error updating client: ${updateError.message}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-invoice function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

serve(handler)
