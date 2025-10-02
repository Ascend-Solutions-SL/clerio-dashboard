import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://jcwhmnwhcsspodwshrkg.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjd2htbndoY3NzcG9kd3NocmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDY3MDgsImV4cCI6MjA2OTEyMjcwOH0.eO_nuM4dPqZTi7lYzOKQ5qhGFAO_1jL_wJ0_UeBxcBs"

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
        }
        Update: {
          empresa?: string
          estado?: string
          pendientes?: number
          categorizadas?: number
        }
      }
      facturas: {
        Row: {
          id: number
          empresa_id: number
          numero: string
          fecha: string
          cliente?: string
          proveedor?: string
          concepto: string
          importe: number
          estado: string
          tipo: "ingresos" | "gastos"
          mes?: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          empresa_id: number
          numero: string
          fecha: string
          cliente?: string
          proveedor?: string
          concepto: string
          importe: number
          estado: string
          tipo: "ingresos" | "gastos"
          mes?: string
        }
        Update: {
          empresa_id?: number
          numero?: string
          fecha?: string
          cliente?: string
          proveedor?: string
          concepto?: string
          importe?: number
          estado?: string
          tipo?: "ingresos" | "gastos"
          mes?: string
        }
      }
    }
  }
}

export type EmpresaRow = Database["public"]["Tables"]["empresas"]["Row"]
export type FacturaRow = Database["public"]["Tables"]["facturas"]["Row"]
