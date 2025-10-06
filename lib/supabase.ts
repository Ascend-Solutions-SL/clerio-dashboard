import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos TypeScript para la base de datos
export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: number
          empresa: string
          estado: string
          pendientes: number
          categorizadas: number
          cif: string
          direccion: string
          telefono: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          empresa: string
          estado: string
          pendientes: number
          categorizadas: number
          cif?: string
          direccion?: string
          telefono?: string
          email?: string
        }
        Update: {
          empresa?: string
          estado?: string
          pendientes?: number
          categorizadas?: number
          cif?: string
          direccion?: string
          telefono?: string
          email?: string
        }
      }
      facturas: {
        Row: {
          id: number
          empresa_id: number
          numero: string
          fecha: string
          tipo: string
          cliente_proveedor: string
          concepto: string
          importe_sin_iva: number
          estado_pago: string
          estado_proces?: string // ✅ NUEVO CAMPO AÑADIDO
          created_at?: string
          updated_at?: string
        }
        Insert: {
          empresa_id: number
          numero: string
          fecha: string
          tipo: string
          cliente_proveedor: string
          concepto: string
          importe_sin_iva: number
          estado_pago: string
          estado_proces?: string // ✅ NUEVO CAMPO AÑADIDO
        }
        Update: {
          empresa_id?: number
          numero?: string
          fecha?: string
          tipo?: string
          cliente_proveedor?: string
          concepto?: string
          importe_sin_iva?: number
          estado_pago?: string
          estado_proces?: string // ✅ NUEVO CAMPO AÑADIDO
        }
      }
      logs: {
        Row: {
          id: number
          created_at: string
          log: string | null
        }
        Insert: {
          log?: string | null
        }
        Update: {
          log?: string | null
        }
      }
      flow_execution: {
        Row: {
          id: number
          action: string
          ini_date: string
          end_date: string
          created_at?: string
        }
        Insert: {
          action: string
          ini_date: string
          end_date: string
        }
        Update: {
          action?: string
          ini_date?: string
          end_date?: string
        }
      }
    }
  }
}

export type EmpresaRow = Database["public"]["Tables"]["empresas"]["Row"]
export type FacturaRow = Database["public"]["Tables"]["facturas"]["Row"]
export type LogRow = Database["public"]["Tables"]["logs"]["Row"]
export type FlowExecutionRow = Database["public"]["Tables"]["flow_execution"]["Row"]
