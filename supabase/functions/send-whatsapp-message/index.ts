
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppMessageRequest {
  to: string;
  template: string;
  language: string;
  components: any[];
}

interface SaleMessageRequest {
  phone: string;
  customerName: string;
  products: Array<{ description: string; value: number }>;
  totalAmount: number;
  paymentMethod: string;
  installments?: number;
  installmentAmount?: number;
  firstPaymentDate?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, customerName, products, totalAmount, paymentMethod, installments, installmentAmount, firstPaymentDate } = await req.json() as SaleMessageRequest;

    // Formatar a lista de produtos
    const productsText = products
      .map(p => `• ${p.description}: ${formatCurrency(p.value)}`)
      .join("\n");

    // Formatar texto do parcelamento
    let paymentDetails = `Forma de pagamento: ${paymentMethod}`;
    if (paymentMethod === "Crédito Próprio Loja" && installments && installments > 1) {
      paymentDetails += `\nParcelamento: ${installments}x de ${formatCurrency(installmentAmount!)}\nVencimento da 1ª parcela: ${firstPaymentDate}`;
    }

    const message = `Olá ${customerName}! 🛍️

Muito obrigado pela sua compra! Aqui está o resumo da sua compra:

*PRODUTOS:*
${productsText}

*TOTAL:* ${formatCurrency(totalAmount)}

${paymentDetails}

Agradecemos a preferência! 🙏`;

    const whatsappData = {
      messaging_product: "whatsapp",
      to: formatPhoneNumber(phone),
      type: "text",
      text: {
        body: message
      }
    };

    const response = await fetch(
      `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(whatsappData),
      }
    );

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatPhoneNumber(phone: string): string {
  // Remove todos os caracteres não numéricos
  const numbers = phone.replace(/\D/g, '');
  
  // Adiciona o código do país (Brasil - 55) se não estiver presente
  if (!numbers.startsWith('55')) {
    return `55${numbers}`;
  }
  
  return numbers;
}
