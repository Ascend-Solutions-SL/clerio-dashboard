"use client"

import { useState, useEffect } from "react"
import { supabase, type EmpresaRow, type FacturaRow, type LogRow } from "@/lib/supabase"

// Tipo para el dashboard (mapeado desde Supabase)
export interface Company {
  id: number
  name: string
  status: string
  processedInvoices: number // Cambio: antes era categorizedInvoices
  reviewInvoices: number // Cambio: antes era pendingInvoices
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
  estadoProcesamiento?: string // ✅ NUEVO CAMPO
}

// ✅ Tipo para los logs
export interface Log {
  id: number
  created_at: string
  log: string | null
  timeAgo: string
}

const mapSupabaseToCompany = (empresaRow: EmpresaRow, processedCount = 0, reviewCount = 0): Company => {
  return {
    id: empresaRow.id,
    name: empresaRow.empresa,
    status: empresaRow.estado,
    processedInvoices: processedCount, // ✅ Ahora basado en datos reales
    reviewInvoices: reviewCount, // ✅ Ahora basado en datos reales
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
    cliente: facturaRow.tipo === "Ingresos" ? facturaRow.cliente_proveedor : "", // Cliente solo en ingresos
    proveedor: facturaRow.tipo === "Gastos" ? facturaRow.cliente_proveedor : "", // Proveedor solo en gastos
    concepto: facturaRow.concepto,
    importe: facturaRow.importe_sin_iva, // Importe sin IVA
    estado: facturaRow.estado_pago,
    estadoProcesamiento: facturaRow.estado_proces, // ✅ NUEVO CAMPO
  }
}

// ✅ Función para calcular tiempo relativo - CORREGIDA
const getTimeAgo = (utcDateString: string): string => {
  try {
    // Crear fecha desde el string UTC (JavaScript maneja automáticamente la zona horaria)
    const logDate = new Date(utcDateString)
    const now = new Date()

    // Calcular diferencia en milisegundos
    const diffInMs = now.getTime() - logDate.getTime()

    // Debug logs (puedes eliminar después)
    console.log("Log date:", logDate.toISOString())
    console.log("Now:", now.toISOString())
    console.log("Diff in ms:", diffInMs)

    // Convertir a diferentes unidades
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    console.log("Diff in minutes:", diffInMinutes)

    // Si la diferencia es negativa, significa que la fecha es futura
    if (diffInMs < 0) {
      return "Ahora"
    }

    if (diffInMinutes < 1) {
      return "Ahora"
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min`
    } else if (diffInHours < 24) {
      return `${diffInHours}h`
    } else if (diffInDays < 7) {
      return `${diffInDays}d`
    } else {
      // Para fechas muy antiguas, mostrar la fecha
      return logDate.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      })
    }
  } catch (error) {
    console.error("Error calculating time ago:", error, "for date:", utcDateString)
    return "Fecha inválida"
  }
}

// ✅ Función para mapear logs de Supabase al formato del dashboard
const mapSupabaseToLog = (logRow: LogRow): Log => {
  return {
    id: logRow.id,
    created_at: logRow.created_at,
    log: logRow.log,
    timeAgo: getTimeAgo(logRow.created_at),
  }
}

// ✅ Función para filtrar facturas por período - ACTUALIZADA con soporte para fechas personalizadas y "total"
export const filterInvoicesByPeriod = (
  invoices: Invoice[],
  period: string,
  customDateRange?: { from: Date; to: Date },
): Invoice[] => {
  // Si es "historico-completo", devolver todas las facturas
  if (period === "historico-completo") {
    return invoices.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentDate = now.getDate()

  const filteredInvoices = invoices.filter((invoice) => {
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

  // Ordenar por fecha (más reciente primero)
  return filteredInvoices.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
}

// ✅ Función para calcular el total absoluto de un período específico (sin considerar tipo)
export const calculateAbsolutePeriodTotal = (
  invoices: Invoice[],
  period: string,
  customDateRange?: { from: Date; to: Date },
): number => {
  const filteredInvoices = filterInvoicesByPeriod(invoices, period, customDateRange)
  return filteredInvoices.reduce((sum, invoice) => sum + invoice.importe, 0)
}

// ✅ Función para calcular el total de un período específico - ACTUALIZADA con soporte para "total"
export const calculatePeriodTotal = (
  invoices: Invoice[],
  period: string,
  customDateRange?: { from: Date; to: Date },
): number => {
  const filteredInvoices = filterInvoicesByPeriod(invoices, period, customDateRange)
  return filteredInvoices.reduce((sum, invoice) => {
    // Sumar ingresos y restar gastos para obtener beneficio neto
    if (invoice.tipo === "Ingresos") {
      return sum + invoice.importe
    } else if (invoice.tipo === "Gastos") {
      return sum - invoice.importe
    }
    return sum
  }, 0)
}

export const useSupabase = () => {
  const [empresas, setEmpresas] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ Función para obtener conteos de facturas por empresa
  const getInvoiceCountsByCompany = async () => {
    try {
      const { data: facturas, error: facturasError } = await supabase
        .from("facturas")
        .select("empresa_id, estado_proces")

      if (facturasError) {
        console.error("Error fetching facturas for counts:", facturasError)
        return {}
      }

      // Agrupar por empresa y contar por estado
      const counts: Record<number, { processed: number; review: number }> = {}

      facturas?.forEach((factura) => {
        if (!counts[factura.empresa_id]) {
          counts[factura.empresa_id] = { processed: 0, review: 0 }
        }

        if (factura.estado_proces?.toLowerCase() === "procesado") {
          counts[factura.empresa_id].processed++
        } else if (factura.estado_proces?.toLowerCase() === "error") {
          counts[factura.empresa_id].review++
        }
      })

      return counts
    } catch (err) {
      console.error("Error calculating invoice counts:", err)
      return {}
    }
  }

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

      // ✅ Obtener conteos reales de facturas
      const invoiceCounts = await getInvoiceCountsByCompany()

      const mappedData =
        data?.map((empresa) => {
          const counts = invoiceCounts[empresa.id] || { processed: 0, review: 0 }
          return mapSupabaseToCompany(empresa, counts.processed, counts.review)
        }) || []

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
    const processedInvoices = empresas.reduce((sum, company) => sum + company.processedInvoices, 0)
    const pendingInvoices = empresas.reduce((sum, company) => sum + company.reviewInvoices, 0)
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
          // Refrescar empresas cuando cambian las facturas para actualizar conteos
          fetchEmpresas()
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
  const [isInitialized, setIsInitialized] = useState(false)

  const fetchFacturas = async (force = false) => {
    // Evitar consultas innecesarias si ya se inicializó y no es force
    if (isInitialized && !force) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log(`🧾 Obteniendo facturas para empresa ${empresaId}...`)

      // Verificar si empresaId es válido
      if (!empresaId || empresaId <= 0) {
        console.log("⚠️ EmpresaId no válido:", empresaId)
        setFacturas({ ingresos: [], gastos: [] })
        setLoading(false)
        setIsInitialized(true)
        return
      }

      // ✅ Consulta optimizada con límite para evitar sobrecarga
      const { data, error: supabaseError } = await supabase
        .from("facturas")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("fecha", { ascending: false })
        .limit(2000) // ✅ Límite más generoso pero controlado

      console.log(`📋 Facturas recibidas: ${data?.length || 0} registros`)
      console.log("❌ Error facturas:", supabaseError)

      if (supabaseError) {
        throw supabaseError
      }

      if (!data || data.length === 0) {
        console.log("📭 No se encontraron facturas para la empresa", empresaId)
        setFacturas({ ingresos: [], gastos: [] })
        setLoading(false)
        setIsInitialized(true)
        return
      }

      // Procesar datos de manera más eficiente
      console.log(`🔄 Procesando ${data.length} facturas...`)

      // Mapear y separar por tipo de manera más eficiente
      const ingresos: Invoice[] = []
      const gastos: Invoice[] = []

      for (const factura of data) {
        const mappedFactura = mapSupabaseToInvoice(factura)

        if (mappedFactura.tipo === "Ingresos") {
          ingresos.push(mappedFactura)
        } else if (mappedFactura.tipo === "Gastos") {
          gastos.push(mappedFactura)
        }
      }

      console.log(`✅ Procesado: ${ingresos.length} ingresos, ${gastos.length} gastos`)

      setFacturas({ ingresos, gastos })
      setIsInitialized(true)
    } catch (err) {
      console.error("💥 Error fetching facturas:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      setFacturas({ ingresos: [], gastos: [] })
      setIsInitialized(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log("🔄 useFacturasEmpresa - empresaId cambió:", empresaId)
    if (empresaId && empresaId > 0) {
      setIsInitialized(false) // Reset initialization flag when empresaId changes
      fetchFacturas(true)
    } else {
      setFacturas({ ingresos: [], gastos: [] })
      setLoading(false)
      setIsInitialized(true)
    }
  }, [empresaId])

  return {
    facturas,
    loading,
    error,
    refresh: () => fetchFacturas(true),
  }
}

// ✅ Hook específico para logs
export const useLogs = (limit = 6) => {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("📝 Obteniendo logs...")

      const { data, error: supabaseError } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)

      console.log("📋 Logs recibidos de Supabase:", data)
      console.log("❌ Error logs:", supabaseError)

      if (supabaseError) {
        throw supabaseError
      }

      if (!data || data.length === 0) {
        console.log("📭 No se encontraron logs")
        setLogs([])
        setLoading(false)
        return
      }

      // Mapear logs
      const mappedLogs = data.map(mapSupabaseToLog)
      console.log("🔄 Logs mapeados:", mappedLogs)

      setLogs(mappedLogs)
    } catch (err) {
      console.error("💥 Error fetching logs:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [limit])

  // Suscripción a cambios en tiempo real para logs
  useEffect(() => {
    const subscription = supabase
      .channel("logs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "logs",
        },
        (payload) => {
          console.log("🔄 Cambio detectado en logs:", payload)
          // Refrescar logs cuando hay cambios
          fetchLogs()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    logs,
    loading,
    error,
    refresh: fetchLogs,
  }
}
