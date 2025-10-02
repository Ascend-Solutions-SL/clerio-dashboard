"use client"

import { useState, useEffect } from "react"
import { supabase, type EmpresaRow, type FacturaRow } from "@/lib/supabase"

// Tipo para el dashboard (mapeado desde Supabase)
export interface Company {
  id: number
  name: string
  status: string
  pendingInvoices: number
  categorizedInvoices: number
  lastUpdate: string
  // Campos adicionales que necesita el dashboard
  cif?: string
  address?: string
  phone?: string
  email?: string
}

// Tipo para las facturas en el dashboard
export interface Invoice {
  id: number
  numero: string
  fecha: string
  cliente?: string
  proveedor?: string
  concepto: string
  importe: number
  estado: string
  mes?: string
}

const mapSupabaseToCompany = (empresaRow: EmpresaRow): Company => {
  return {
    id: empresaRow.id,
    name: empresaRow.empresa,
    status: empresaRow.estado,
    pendingInvoices: empresaRow.pendientes,
    categorizedInvoices: empresaRow.categorizadas,
    lastUpdate: empresaRow.updated_at
      ? new Date(empresaRow.updated_at).toLocaleString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        })
      : "Hace un momento",
    cif: empresaRow.cif || "", // ✅ REAL desde la DB
    address: empresaRow.direccion || "", // ✅ REAL desde la DB
    phone: empresaRow.telefono || "", // ✅ REAL desde la DB
    email: empresaRow.email || "", // ✅ REAL desde la DB
  }
}

// Función para mapear facturas de Supabase al formato del dashboard
const mapSupabaseToInvoice = (facturaRow: FacturaRow): Invoice => {
  return {
    id: facturaRow.id,
    numero: facturaRow.numero,
    fecha: facturaRow.fecha,
    tipo: facturaRow.tipo, // Mantenemos el tipo para el filtrado posterior
    cliente: facturaRow.tipo === "ingreso" ? facturaRow.cliente_proveedor : "", // Cliente solo en ingresos
    proveedor: facturaRow.tipo === "gasto" ? facturaRow.cliente_proveedor : "", // Proveedor solo en gastos
    concepto: facturaRow.concepto,
    importe: facturaRow.importe_sin_iva, // Importe sin IVA
    estado: facturaRow.estado,
  }
}

// ✅ Función para filtrar facturas por período - ACTUALIZADA con soporte para fechas personalizadas
export const filterInvoicesByPeriod = (
  invoices: Invoice[],
  period: string,
  customDateRange?: { from: Date; to: Date },
): Invoice[] => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentDate = now.getDate()

  return invoices.filter((invoice) => {
    const invoiceDate = new Date(invoice.fecha)
    const invoiceYear = invoiceDate.getFullYear()
    const invoiceMonth = invoiceDate.getMonth()

    switch (period) {
      case "mes-actual":
        return invoiceYear === currentYear && invoiceMonth === currentMonth

      case "mes-anterior":
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
        return invoiceYear === lastMonthYear && invoiceMonth === lastMonth

      case "q1":
        return invoiceYear === currentYear && invoiceMonth >= 0 && invoiceMonth <= 2

      case "q2":
        return invoiceYear === currentYear && invoiceMonth >= 3 && invoiceMonth <= 5

      case "q3":
        return invoiceYear === currentYear && invoiceMonth >= 6 && invoiceMonth <= 8

      case "q4":
        return invoiceYear === currentYear && invoiceMonth >= 9 && invoiceMonth <= 11

      case "año-actual":
        return invoiceYear === currentYear

      case "año-anterior":
        return invoiceYear === currentYear - 1

      case "personalizado":
        // ✅ Filtrado por rango de fechas personalizado
        if (!customDateRange) return true

        // Normalizar fechas para comparación (solo fecha, sin hora)
        const invoiceDateOnly = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), invoiceDate.getDate())
        const fromDateOnly = new Date(
          customDateRange.from.getFullYear(),
          customDateRange.from.getMonth(),
          customDateRange.from.getDate(),
        )
        const toDateOnly = new Date(
          customDateRange.to.getFullYear(),
          customDateRange.to.getMonth(),
          customDateRange.to.getDate(),
        )

        return invoiceDateOnly >= fromDateOnly && invoiceDateOnly <= toDateOnly

      default:
        return true
    }
  })
}

// ✅ Función para calcular el total de un período específico - ACTUALIZADA
export const calculatePeriodTotal = (
  invoices: Invoice[],
  period: string,
  customDateRange?: { from: Date; to: Date },
): number => {
  const filteredInvoices = filterInvoicesByPeriod(invoices, period, customDateRange)
  return filteredInvoices.reduce((sum, invoice) => sum + invoice.importe, 0)
}

export const useSupabase = () => {
  const [empresas, setEmpresas] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para obtener todas las empresas
  const fetchEmpresas = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔍 Intentando conectar con Supabase...")

      const { data, error: supabaseError } = await supabase
        .from("empresas")
        .select("*")
        .order("id", { ascending: true })

      console.log("📊 Datos recibidos de Supabase:", data)
      console.log("❌ Error de Supabase:", supabaseError)

      if (supabaseError) {
        throw supabaseError
      }

      const mappedData = data?.map(mapSupabaseToCompany) || []
      console.log("🔄 Datos mapeados:", mappedData)
      setEmpresas(mappedData)
    } catch (err) {
      console.error("💥 Error fetching empresas:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener estadísticas del overview
  const getOverviewStats = () => {
    const activeCompanies = empresas.length
    const processedInvoices = empresas.reduce((sum, company) => sum + company.categorizedInvoices, 0)
    const pendingInvoices = empresas.reduce((sum, company) => sum + company.pendingInvoices, 0)
    // ✅ Ahora cuenta cualquier estado que no sea común como "alerta"
    const importantAlerts = empresas.filter(
      (company) => !["activo", "ok", "bien", "correcto", "normal"].includes(company.status.toLowerCase()),
    ).length

    return {
      activeCompanies,
      processedInvoices,
      pendingInvoices,
      importantAlerts,
    }
  }

  // Función para refrescar datos
  const refresh = async () => {
    await fetchEmpresas()
  }

  // Función para agregar una nueva empresa
  const addEmpresa = async (empresa: {
    empresa: string
    estado: string
    pendientes: number
    categorizadas: number
  }) => {
    try {
      const { data, error: supabaseError } = await supabase.from("empresas").insert([empresa]).select()

      if (supabaseError) {
        throw supabaseError
      }

      if (data && data.length > 0) {
        const newCompany = mapSupabaseToCompany(data[0])
        setEmpresas((prev) => [...prev, newCompany])
      }

      return { success: true, error: null }
    } catch (err) {
      console.error("Error adding empresa:", err)
      return { success: false, error: err instanceof Error ? err.message : "Error desconocido" }
    }
  }

  // Función para actualizar una empresa
  const updateEmpresa = async (
    id: number,
    updates: Partial<{ empresa: string; estado: string; pendientes: number; categorizadas: number }>,
  ) => {
    try {
      const { data, error: supabaseError } = await supabase.from("empresas").update(updates).eq("id", id).select()

      if (supabaseError) {
        throw supabaseError
      }

      if (data && data.length > 0) {
        const updatedCompany = mapSupabaseToCompany(data[0])
        setEmpresas((prev) => prev.map((company) => (company.id === id ? updatedCompany : company)))
      }

      return { success: true, error: null }
    } catch (err) {
      console.error("Error updating empresa:", err)
      return { success: false, error: err instanceof Error ? err.message : "Error desconocido" }
    }
  }

  // Función para eliminar una empresa
  const deleteEmpresa = async (id: number) => {
    try {
      const { error: supabaseError } = await supabase.from("empresas").delete().eq("id", id)

      if (supabaseError) {
        throw supabaseError
      }

      setEmpresas((prev) => prev.filter((company) => company.id !== id))
      return { success: true, error: null }
    } catch (err) {
      console.error("Error deleting empresa:", err)
      return { success: false, error: err instanceof Error ? err.message : "Error desconocido" }
    }
  }

  // Función para agregar una nueva factura
  const addFactura = async (factura: {
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
  }) => {
    try {
      const { data, error: supabaseError } = await supabase.from("facturas").insert([factura]).select()

      if (supabaseError) {
        throw supabaseError
      }

      return { success: true, error: null, data: data?.[0] }
    } catch (err) {
      console.error("Error adding factura:", err)
      return { success: false, error: err instanceof Error ? err.message : "Error desconocido", data: null }
    }
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchEmpresas()
  }, [])

  // Suscripción a cambios en tiempo real
  useEffect(() => {
    const subscription = supabase
      .channel("empresas_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "empresas",
        },
        (payload) => {
          console.log("🔄 Cambio detectado en empresas:", payload)
          // Refrescar datos cuando hay cambios
          fetchEmpresas()
        },
      )
      .subscribe()

    // También suscribirse a cambios en facturas
    const facturasSub = supabase
      .channel("facturas_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facturas",
        },
        (payload) => {
          console.log("🔄 Cambio detectado en facturas:", payload)
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
      facturasSub.unsubscribe()
    }
  }, [])

  return {
    empresas,
    loading,
    error,
    getOverviewStats,
    refresh,
    addEmpresa,
    updateEmpresa,
    deleteEmpresa,
    addFactura,
  }
}

// Hook para obtener una empresa específica
export const useEmpresa = (id: number) => {
  const { empresas, loading, error } = useSupabase()
  const empresa = empresas.find((company) => company.id === id)

  return {
    empresa,
    loading,
    error,
  }
}

// Hook específico para facturas de una empresa - CORREGIDO
export const useFacturasEmpresa = (empresaId: number) => {
  const [facturas, setFacturas] = useState<{ ingresos: Invoice[]; gastos: Invoice[] }>({
    ingresos: [],
    gastos: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFacturas = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🧾 Obteniendo facturas para empresa ${empresaId}...`)

      // Verificar si empresaId es válido
      if (!empresaId || empresaId === 0) {
        console.log("⚠️ EmpresaId no válido:", empresaId)
        setFacturas({ ingresos: [], gastos: [] })
        setLoading(false)
        return
      }

      const { data, error: supabaseError } = await supabase
        .from("facturas")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("fecha", { ascending: false })

      console.log("📋 Facturas recibidas de Supabase:", data)
      console.log("❌ Error facturas:", supabaseError)

      if (supabaseError) {
        throw supabaseError
      }

      if (!data || data.length === 0) {
        console.log("📭 No se encontraron facturas para la empresa", empresaId)
        setFacturas({ ingresos: [], gastos: [] })
        setLoading(false)
        return
      }

      // Mapear y separar por tipo
      const mappedFacturas = data.map(mapSupabaseToInvoice)

      console.log(JSON.stringify(data, null, 2))

      // Filtrar facturas por tipo 'ingreso' y 'gasto'
      const ingresos = mappedFacturas.filter((factura) => factura.tipo === "ingreso")
      const gastos = mappedFacturas.filter((factura) => factura.tipo === "gasto")

      console.log("💰 Ingresos encontrados:", ingresos.length, ingresos)
      console.log("💸 Gastos encontrados:", gastos.length, gastos)

      setFacturas({ ingresos, gastos })
    } catch (err) {
      console.error("💥 Error fetching facturas:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      setFacturas({ ingresos: [], gastos: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log("🔄 useFacturasEmpresa - empresaId cambió:", empresaId)
    if (empresaId && empresaId > 0) {
      fetchFacturas()
    } else {
      setFacturas({ ingresos: [], gastos: [] })
      setLoading(false)
    }
  }, [empresaId])

  return {
    facturas,
    loading,
    error,
    refresh: fetchFacturas,
  }
}
