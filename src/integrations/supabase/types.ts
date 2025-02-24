export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      lblz_clients: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          document: string | null
          id: string
          invoice_day: number | null
          is_whatsapp: boolean | null
          last_invoice_sent_at: string | null
          last_invoice_sent_month: string | null
          name: string
          phone: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          document?: string | null
          id?: string
          invoice_day?: number | null
          is_whatsapp?: boolean | null
          last_invoice_sent_at?: string | null
          last_invoice_sent_month?: string | null
          name: string
          phone: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          document?: string | null
          id?: string
          invoice_day?: number | null
          is_whatsapp?: boolean | null
          last_invoice_sent_at?: string | null
          last_invoice_sent_month?: string | null
          name?: string
          phone?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lblz_debts: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          description: string | null
          id: string
          invoice_id: string | null
          invoice_month: string | null
          products: Json | null
          sale_id: string | null
          status: Database["public"]["Enums"]["debt_status"]
          transaction_date: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          invoice_month?: string | null
          products?: Json | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["debt_status"]
          transaction_date?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          invoice_month?: string | null
          products?: Json | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["debt_status"]
          transaction_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "lblz_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lblz_debts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "lblz_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lblz_debts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "lblz_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      lblz_invoices: {
        Row: {
          br_code: string | null
          client_id: string
          closed_at: string
          created_at: string
          id: string
          month: string
          paid_amount: number
          payment_link_url: string | null
          qr_code_image: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          br_code?: string | null
          client_id: string
          closed_at?: string
          created_at?: string
          id?: string
          month: string
          paid_amount?: number
          payment_link_url?: string | null
          qr_code_image?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          br_code?: string | null
          client_id?: string
          closed_at?: string
          created_at?: string
          id?: string
          month?: string
          paid_amount?: number
          payment_link_url?: string | null
          qr_code_image?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lblz_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "lblz_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lblz_payments: {
        Row: {
          amount: number
          created_at: string
          debt_id: string | null
          id: string
          invoice_month: string
          payment_date: string
          payment_method: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          debt_id?: string | null
          id?: string
          invoice_month: string
          payment_date?: string
          payment_method?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          debt_id?: string | null
          id?: string
          invoice_month?: string
          payment_date?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "lblz_debts"
            referencedColumns: ["id"]
          },
        ]
      }
      lblz_sales: {
        Row: {
          client_id: string
          created_at: string
          debt_id: string | null
          id: string
          payment_method: string | null
          products: Json
          sale_number: number | null
          total_amount: number
        }
        Insert: {
          client_id: string
          created_at?: string
          debt_id?: string | null
          id?: string
          payment_method?: string | null
          products: Json
          sale_number?: number | null
          total_amount: number
        }
        Update: {
          client_id?: string
          created_at?: string
          debt_id?: string | null
          id?: string
          payment_method?: string | null
          products?: Json
          sale_number?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "lblz_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "lblz_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lblz_sales_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "lblz_debts"
            referencedColumns: ["id"]
          },
        ]
      }
      rrrr: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      debt_status: "aberta" | "paga" | "parcial"
      invoice_status: "fechada" | "fechada_paga" | "fechada_parcial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
