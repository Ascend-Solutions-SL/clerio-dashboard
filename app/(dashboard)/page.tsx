"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Building2,
  FileText,
  AlertTriangle,
  Download,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Settings,
  Home,
  Users,
  TrendingUp,
  Plug,
  Mail,
  HardDrive,
  Droplets,
  Cloud,
  Zap,
  RefreshCw,
  ArrowLeft,
  Euro,
  Send,
  BookOpen,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronDown,
  CalendarIcon,
} from "lucide-react"
import {
  useSupabase,
  useFacturasEmpresa,
  filterInvoicesByPeriod,
  calculatePeriodTotal,
  calculateAbsolutePeriodTotal,
  useLogs,
} from "@/hooks/use-supabase"
import { cn } from "@/lib/utils"
import { format, parse, isValid } from "date-fns"
import { es } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import ConnectGoogleButton from "@/components/ConnectGoogleButton"

type Incident = {
  id: number
  type: string
  company: string
  description: string
  action: string
  severity: "high" | "medium" | "low"
}

const incidentsData: Incident[] = []

const integrations = [
  {
    id: 1,
    name: "Gmail",
    description: "Lectura automática de correos con facturas adjuntas",
    icon: Mail,
    status: "connected",
    lastSync: "Hace 15 min",
    invoicesFound: 23,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    id: 2,
    name: "Google Drive",
    description: "Sincronización de carpetas compartidas con clientes",
    icon: HardDrive,
    status: "connected",
    lastSync: "Hace 1 hora",
    invoicesFound: 45,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: 3,
    name: "Dropbox",
    description: "Acceso a documentos compartidos por clientes",
    icon: Droplets,
    status: "disconnected",
    lastSync: "Nunca",
    invoicesFound: 0,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    id: 4,
    name: "OneDrive",
    description: "Integración con Microsoft OneDrive",
    icon: Cloud,
    status: "disconnected",
    lastSync: "Nunca",
    invoicesFound: 0,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  {
    id: 5,
    name: "Outlook",
    description: "Lectura de correos corporativos con facturas",
    icon: Mail,
    status: "connected",
    lastSync: "Hace 30 min",
    invoicesFound: 12,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: 6,
    name: "WhatsApp Business",
    description: "Recepción de facturas vía WhatsApp",
    icon: Zap,
    status: "disconnected",
    lastSync: "Nunca",
    invoicesFound: 0,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
]

export default function Dashboard() {
  const [businessName, setBusinessName] = useState('Mi Empresa')
  
  useEffect(() => {
    const fetchBusinessName = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('Error fetching user data:', authError)
          return
        }
        
        if (user) {
          // Fetch business name from auth_users table
          const { data: authUserData, error: dbError } = await supabase
            .from('auth_users')
            .select('user_businessname')
            .eq('user_uid', user.id)
            .single()
          
          if (dbError) {
            console.error('Error fetching business name from auth_users:', dbError)
            return
          }
          
          if (authUserData?.user_businessname) {
            setBusinessName(authUserData.user_businessname)
          }
        }
      } catch (error) {
        console.error('Error fetching business name:', error)
      }
    }
    
    fetchBusinessName()
  }, [])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("empresas")
  const [selectedMonth, _setSelectedMonth] = useState("todos")
  const [invoiceType, setInvoiceType] = useState("ingresos")
  const [selectedPeriod, setSelectedPeriod] = useState("historico-completo")
  const [showPeriodFilter, setShowPeriodFilter] = useState(false)

  // ✅ Estados para el período personalizado
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null)
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [tempDateRange, setTempDateRange] = useState<{ from?: Date; to?: Date }>({})

  // ✅ Estados separados para inputs manuales - CORREGIDO
  const [fromDateInput, setFromDateInput] = useState("")
  const [toDateInput, setToDateInput] = useState("")
  const [dateInputErrors, setDateInputErrors] = useState<{ from?: string; to?: string }>({})

  // ✅ Estados para filtros y ordenación de empresas
  const [companyStatusFilter, setCompanyStatusFilter] = useState("todos")
  const [companySortBy, setCompanySortBy] = useState("nombre")
  const [showCompanyFilters, setShowCompanyFilters] = useState(false)

  // ✅ Estados para el barrido de correos
  const [showEmailSweep, setShowEmailSweep] = useState(false)
  const [emailSweepFromInput, setEmailSweepFromInput] = useState("")
  const [emailSweepToInput, setEmailSweepToInput] = useState("")
  const [emailSweepDateRange, setEmailSweepDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [emailSweepErrors, setEmailSweepErrors] = useState<{ from?: string; to?: string }>({})

  // ✅ Estados para el barrido de Drive
  const [showDriveSweep, setShowDriveSweep] = useState(false)
  const [driveSweepFromInput, setDriveSweepFromInput] = useState("")
  const [driveSweepToInput, setDriveSweepToInput] = useState("")
  const [driveSweepDateRange, setDriveSweepDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [driveSweepErrors, setDriveSweepErrors] = useState<{ from?: string; to?: string }>({})

  // Usar el hook de Supabase
  const {
    empresas: companiesData,
    loading: companiesLoading,
    error: companiesError,
    getOverviewStats,
    refresh: refreshEmpresas,
  } = useSupabase()

  // Usar el hook de logs
  const { logs, loading: logsLoading, error: logsError } = useLogs(20)

  // Estado y ref para indicar scroll en "Actividad Reciente"
  const [isActivityScrolling, setIsActivityScrolling] = useState(false)
  const activityScrollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const activityContainerRef = useRef<HTMLDivElement | null>(null)

  const handleActivityScroll = () => {
    if (!isActivityScrolling) setIsActivityScrolling(true)
    if (activityScrollTimerRef.current) clearTimeout(activityScrollTimerRef.current)
    activityScrollTimerRef.current = setTimeout(() => setIsActivityScrolling(false), 600)
  }

  const updateActivityThumbVars = () => {
    const el = activityContainerRef.current
    if (!el) return
    const ch = el.clientHeight
    const sh = el.scrollHeight
    const st = el.scrollTop
    const inset = 4 // match CSS inset
    const trackPx = Math.max(0, ch - inset * 2)
    if (sh <= ch || ch === 0 || trackPx === 0) {
      el.style.setProperty("--sa-opacity", "0")
      el.style.setProperty("--sa-thumb-top-px", `${inset}px`)
      el.style.setProperty("--sa-thumb-height-px", `${trackPx}px`)
      return
    }
    const heightPx = (ch / sh) * trackPx
    const scrollRange = sh - ch
    const topPx = inset + (scrollRange > 0 ? (st / scrollRange) * (trackPx - heightPx) : 0)
    el.style.setProperty("--sa-thumb-height-px", `${heightPx}px`)
    el.style.setProperty("--sa-thumb-top-px", `${topPx}px`)
    el.style.setProperty("--sa-opacity", "1")
  }

  // Obtener estadísticas del overview
  const overviewData = getOverviewStats()

  // Función para manejar el refresh de datos
  const handleRefresh = async () => {
    try {
      await refreshEmpresas()
    } catch (error) {
      console.error("Error refreshing data:", error)
    }
  }

  // ✅ Función para validar y parsear fecha manual - CORREGIDA
  const parseManualDate = (dateString: string): Date | null => {
    if (!dateString.trim()) return null

    // Intentar varios formatos
    const formats = ["dd/MM/yyyy", "dd-MM-yyyy", "dd.MM.yyyy", "yyyy-MM-dd"]

    for (const formatStr of formats) {
      try {
        const parsed = parse(dateString, formatStr, new Date())
        if (isValid(parsed)) {
          return parsed
        }
      } catch (e) {
        continue
      }
    }

    return null
  }

  // ✅ Función para manejar cambios en inputs - SIMPLIFICADA
  const handleDateInputChange = (field: "from" | "to", value: string) => {
    if (field === "from") {
      setFromDateInput(value)
    } else {
      setToDateInput(value)
    }
  }

  // ✅ Función para procesar fecha cuando el usuario termina de escribir - CORREGIDA
  const handleDateInputBlur = (field: "from" | "to") => {
    const value = field === "from" ? fromDateInput : toDateInput

    if (!value.trim()) {
      // Si está vacío, limpiar
      setTempDateRange((prev) => ({ ...prev, [field]: undefined }))
      setDateInputErrors((prev) => ({ ...prev, [field]: undefined }))
      return
    }

    const parsed = parseManualDate(value)
    if (!parsed) {
      setDateInputErrors((prev) => ({
        ...prev,
        [field]: "Formato inválido. Usa dd/MM/yyyy",
      }))
      setTempDateRange((prev) => ({ ...prev, [field]: undefined }))
    } else {
      setDateInputErrors((prev) => ({ ...prev, [field]: undefined }))
      setTempDateRange((prev) => ({ ...prev, [field]: parsed }))
    }
  }

  // ✅ Función para manejar Enter en los inputs - CORREGIDA
  const handleDateInputKeyDown = (field: "from" | "to", e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleDateInputBlur(field)
    }
  }

  // ✅ Verificar si el botón "Aplicar" debe estar habilitado - CORREGIDA
  const isApplyButtonEnabled = () => {
    const hasValidDates = tempDateRange.from && tempDateRange.to
    const hasNoErrors = !dateInputErrors.from && !dateInputErrors.to
    return hasValidDates && hasNoErrors
  }

  // ✅ Función para manejar cambios en inputs de barrido de correos - SIMPLIFICADA
  const handleEmailSweepDateInputChange = (field: "from" | "to", value: string) => {
    if (field === "from") {
      setEmailSweepFromInput(value)
    } else {
      setEmailSweepToInput(value)
    }
  }

  // ✅ Función para procesar fecha de barrido de correos cuando el usuario termina de escribir - CORREGIDA
  const handleEmailSweepDateInputBlur = (field: "from" | "to") => {
    const value = field === "from" ? emailSweepFromInput : emailSweepToInput

    if (!value.trim()) {
      // Si está vacío, limpiar
      setEmailSweepDateRange((prev) => ({ ...prev, [field]: undefined }))
      setEmailSweepErrors((prev) => ({ ...prev, [field]: undefined }))
      return
    }

    const parsed = parseManualDate(value)
    if (!parsed) {
      setEmailSweepErrors((prev) => ({
        ...prev,
        [field]: "Formato inválido. Usa dd/MM/yyyy",
      }))
      setEmailSweepDateRange((prev) => ({ ...prev, [field]: undefined }))
    } else {
      setEmailSweepErrors((prev) => ({ ...prev, [field]: undefined }))
      setEmailSweepDateRange((prev) => ({ ...prev, [field]: parsed }))
    }
  }

  // ✅ Función para manejar Enter en los inputs de barrido de correos - CORREGIDA
  const handleEmailSweepDateInputKeyDown = (field: "from" | "to", e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEmailSweepDateInputBlur(field)
    }
  }

  // ✅ Verificar si el botón "Enviar Solicitud" debe estar habilitado - CORREGIDA
  const isEmailSweepSubmitEnabled = () => {
    const hasValidDates = emailSweepDateRange.from && emailSweepDateRange.to
    const hasNoErrors = !emailSweepErrors.from && !emailSweepErrors.to
    return hasValidDates && hasNoErrors
  }

  // ✅ Función para manejar el envío de la solicitud de barrido de correos - CORREGIDA
  const handleEmailSweepSubmit = async () => {
    if (!isEmailSweepSubmitEnabled()) return

    // Mensaje inmediato al presionar el botón
    toast({
      title: "Solicitud registrada",
      description: "Has presionado \"Enviar Solicitud\".",
      className: "border-green-200 bg-green-50 text-green-900",
    })

    if (emailSweepDateRange.to && emailSweepDateRange.from && emailSweepDateRange.to < emailSweepDateRange.from) {
      setEmailSweepErrors({ to: "La fecha final no puede ser anterior a la inicial" })
      return
    }

    try {
      const formattedFromDate = format(emailSweepDateRange.from!, "yyyy-MM-dd")
      const formattedToDate = format(emailSweepDateRange.to!, "yyyy-MM-dd")

      const { error } = await supabase
        .from("flow_execution")
        .insert([
          {
            action: "barrido_correo",
            ini_date: formattedFromDate,
            end_date: formattedToDate,
          },
        ])

      if (error) {
        console.error("Error enviando solicitud de barrido de correos:", error)
        return
      }

      // Opcional: limpiar estado tras éxito
      setShowEmailSweep(false)
      setEmailSweepDateRange({})
      setEmailSweepFromInput("")
      setEmailSweepToInput("")
      setEmailSweepErrors({})
    } catch (err) {
      console.error("Excepción enviando solicitud de barrido de correos:", err)
    }
  }

  // ✅ Función para manejar cambios en inputs de barrido de Drive - SIMPLIFICADA
  const handleDriveSweepDateInputChange = (field: "from" | "to", value: string) => {
    if (field === "from") {
      setDriveSweepFromInput(value)
    } else {
      setDriveSweepToInput(value)
    }
  }

  // ✅ Función para procesar fecha de barrido de Drive cuando el usuario termina de escribir - CORREGIDA
  const handleDriveSweepDateInputBlur = (field: "from" | "to") => {
    const value = field === "from" ? driveSweepFromInput : driveSweepToInput

    if (!value.trim()) {
      // Si está vacío, limpiar
      setDriveSweepDateRange((prev) => ({ ...prev, [field]: undefined }))
      setDriveSweepErrors((prev) => ({ ...prev, [field]: undefined }))
      return
    }

    const parsed = parseManualDate(value)
    if (!parsed) {
      setDriveSweepErrors((prev) => ({
        ...prev,
        [field]: "Formato inválido. Usa dd/MM/yyyy",
      }))
      setDriveSweepDateRange((prev) => ({ ...prev, [field]: undefined }))
    } else {
      setDriveSweepErrors((prev) => ({ ...prev, [field]: undefined }))
      setDriveSweepDateRange((prev) => ({ ...prev, [field]: parsed }))
    }
  }

  // ✅ Función para manejar Enter en los inputs de barrido de Drive - CORREGIDA
  const handleDriveSweepDateInputKeyDown = (field: "from" | "to", e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleDriveSweepDateInputBlur(field)
    }
  }

  // ✅ Verificar si el botón "Enviar Solicitud" debe estar habilitado - CORREGIDA
  const isDriveSweepSubmitEnabled = () => {
    const hasValidDates = driveSweepDateRange.from && driveSweepDateRange.to
    const hasNoErrors = !driveSweepErrors.from && !driveSweepErrors.to
    return hasValidDates && hasNoErrors
  }

  // ✅ Función para manejar el envío de la solicitud de barrido de Drive - CORREGIDA
  const handleDriveSweepSubmit = async () => {
    if (!isDriveSweepSubmitEnabled()) return

    // Mensaje inmediato al presionar el botón
    toast({
      title: "Solicitud registrada",
      description: "Has presionado \"Enviar Solicitud\".",
      className: "border-green-200 bg-green-50 text-green-900",
    })

    if (driveSweepDateRange.to && driveSweepDateRange.from && driveSweepDateRange.to < driveSweepDateRange.from) {
      setDriveSweepErrors({ to: "La fecha final no puede ser anterior a la inicial" })
      return
    }

    try {
      const formattedFromDate = format(driveSweepDateRange.from!, "yyyy-MM-dd")
      const formattedToDate = format(driveSweepDateRange.to!, "yyyy-MM-dd")

      const { error } = await supabase
        .from("flow_execution")
        .insert([
          {
            action: "barrido_drive",
            ini_date: formattedFromDate,
            end_date: formattedToDate,
          },
        ])

      if (error) {
        console.error("Error enviando solicitud de barrido de Drive:", error)
        return
      }

      // Opcional: limpiar estado tras éxito
      setShowDriveSweep(false)
      setDriveSweepDateRange({})
      setDriveSweepFromInput("")
      setDriveSweepToInput("")
      setDriveSweepErrors({})
    } catch (err) {
      console.error("Excepción enviando solicitud de barrido de Drive:", err)
    }
  }

  // Lee ?tab= de la URL al cargar y sincroniza el estado
  useEffect(() => {
    const updateActiveTabFromUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const urlTab = params.get('tab')
        const allowed = new Set(["empresas", "integraciones", "incidencias", "configuracion"]) 
        if (urlTab && allowed.has(urlTab)) {
          setActiveTab(urlTab)
        } else if (!urlTab) {
          // Set default tab if none is specified
          setActiveTab("empresas")
        }
      } catch (e) {
        console.error("Error updating tab from URL:", e)
      }
    }

    // Initial load
    updateActiveTabFromUrl()

    // Listen for tab changes from the sidebar
    window.addEventListener('tabchange', updateActiveTabFromUrl)
    
    // Also listen for popstate (back/forward navigation)
    window.addEventListener('popstate', updateActiveTabFromUrl)

    return () => {
      window.removeEventListener('tabchange', updateActiveTabFromUrl)
      window.removeEventListener('popstate', updateActiveTabFromUrl)
    }
  }, [])

  // When activeTab changes, update the URL
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', activeTab)
      window.history.replaceState({}, '', url.toString())
    } catch (e) {
      console.error("Error updating URL:", e)
    }
  }, [activeTab])

  // Auth guard (mover arriba para mantener orden de Hooks)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)

  // Inicializa estado de conexión Google desde localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem("google_connected")
      if (v === "1") setGoogleConnected(true)
    } catch {}
  }, [])

  // Comprobar sesión y redirigir si no hay
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!cancelled) {
          if (data.session) {
            setIsAuthed(true)
          } else {
            window.location.replace("/login")
          }
        }
      } catch {
        if (!cancelled) window.location.replace("/login")
      } finally {
        if (!cancelled) setAuthChecking(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  // Toast/banner cuando vuelve google=connected
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const google = url.searchParams.get("google")
      if (google === "connected") {
        toast({
          title: "Integración de Google",
          description: "Google conectado correctamente.",
          className: "border-green-200 bg-green-50 text-green-900",
        })
        setGoogleConnected(true)
        try { localStorage.setItem("google_connected", "1") } catch {}
        url.searchParams.delete("google")
        window.history.replaceState(null, "", url.toString())
      }
    } catch {}
  }, [])

  // Loading guard de auth
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Comprobando sesión...</p>
        </div>
      </div>
    )
  }

  // Si no hay sesión, ya se redirigió; evita parpadeo
  if (!isAuthed) {
    return null
  }

  // Mostrar loading state
  if (companiesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  // Mostrar error state
  if (companiesError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Error al cargar los datos: {companiesError}</p>
          <Button onClick={handleRefresh} className="bg-gray-900 hover:bg-gray-800 text-white">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  // Función simplificada - sin iconos
  const getStatusIcon = (status?: string) => {
    return null
  }

  // ✅ Función simplificada para badges de estado - solo activa/inactiva
  const getStatusBadge = (status?: string) => {
    const statusLower = (status ?? "").toLowerCase()

    // Estado activa - badge verde suave
    if (statusLower === "activa" || statusLower === "activo") {
      return <Badge className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">Activa</Badge>
    }

    // Estado inactiva - badge gris
    if (statusLower === "inactiva" || statusLower === "inactivo") {
      return <Badge className="bg-gray-50 text-gray-600 hover:bg-gray-50 border-gray-200">Inactiva</Badge>
    }

    // Por defecto - badge gris con el valor exacto de la BD
    return <Badge variant="secondary">{status}</Badge>
  }

  const getIntegrationStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-50 text-green-700 border-green-200">Conectado</Badge>
      case "disconnected":
        return <Badge className="bg-gray-50 text-gray-700 border-gray-200">Desconectado</Badge>
      case "error":
        return <Badge className="bg-red-50 text-red-700 border-red-200">Error</Badge>
      default:
        return <Badge variant="secondary">-</Badge>
    }
  }

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case "pagada":
        return <Badge className="bg-green-50 text-green-700 border-green-200">Pagada</Badge>
      case "pendiente":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pendiente</Badge>
      case "vencida":
        return <Badge className="bg-red-50 text-red-700 border-red-200">Vencida</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // ✅ Filtrado y ordenación de empresas mejorado
  const filteredCompanies = companiesData
    .filter((company) => {
      // Filtro por búsqueda
      const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase())

      // ✅ Excluir empresas con 0 facturas procesadas y 0 por revisar
      const hasActivity = company.processedInvoices > 0 || company.reviewInvoices > 0

      // Filtro por estado
      if (companyStatusFilter === "todos") {
        return matchesSearch && hasActivity
      }

      return matchesSearch && company.status?.toLowerCase() === companyStatusFilter.toLowerCase() && hasActivity
    })
    .sort((a, b) => {
      switch (companySortBy) {
        case "procesadas":
          return b.processedInvoices - a.processedInvoices
        case "por-revisar":
          return b.reviewInvoices - a.reviewInvoices
        case "nombre":
        default:
          return a.name.localeCompare(b.name)
      }
    })

  // Función para obtener datos de empresa
  const getCompanyData = (companyId: number) => {
    return companiesData.find((company) => company.id === companyId)
  }

  // ✅ Datos de períodos con cálculo dinámico de importes - REORDENADOS
  const getPeriodOptions = (ingresos: any[], gastos: any[]) => {
    const allInvoices = [...ingresos, ...gastos]

    return [
      // Primero: Total (todas las facturas)
      { value: "historico-completo", label: "Histórico Completo", amount: calculatePeriodTotal(allInvoices, "historico-completo") },

      // Segundo: Mes actual y anterior
      { value: "mes-actual", label: "Mes actual", amount: calculatePeriodTotal(allInvoices, "mes-actual") },
      { value: "mes-anterior", label: "Mes anterior", amount: calculatePeriodTotal(allInvoices, "mes-anterior") },

      // Tercero: Trimestres
      { value: "q1", label: "1er trimestre", amount: calculatePeriodTotal(allInvoices, "q1") },
      { value: "q2", label: "2do trimestre", amount: calculatePeriodTotal(allInvoices, "q2") },
      { value: "q3", label: "3er trimestre", amount: calculatePeriodTotal(allInvoices, "q3") },
      { value: "q4", label: "4to trimestre", amount: calculatePeriodTotal(allInvoices, "q4") },

      // Cuarto: Años
      { value: "año-actual", label: "Año actual", amount: calculatePeriodTotal(allInvoices, "año-actual") },
      { value: "año-anterior", label: "Año anterior", amount: calculatePeriodTotal(allInvoices, "año-anterior") },

      // Último: Personalizado
      {
        value: "personalizado",
        label: "Personalizado",
        amount: customDateRange ? calculatePeriodTotal(allInvoices, "personalizado", customDateRange) : 0,
      },
    ]
  }

  // ✅ Función para obtener el label del período - ACTUALIZADA
  const getPeriodLabel = (value: string) => {
    if (value === "personalizado" && customDateRange) {
      return `${format(customDateRange.from, "dd/MM/yyyy", { locale: es })} - ${format(customDateRange.to, "dd/MM/yyyy", { locale: es })}`
    }

    const defaultOptions = [
      { value: "historico-completo", label: "Histórico Completo" },
      { value: "mes-actual", label: "Mes actual" },
      { value: "mes-anterior", label: "Mes anterior" },
      { value: "q1", label: "1er trimestre" },
      { value: "q2", label: "2do trimestre" },
      { value: "q3", label: "3er trimestre" },
      { value: "q4", label: "4to trimestre" },
      { value: "año-actual", label: "Año actual" },
      { value: "año-anterior", label: "Año anterior" },
      { value: "personalizado", label: "Personalizado" },
    ]

    const option = defaultOptions.find((opt) => opt.value === value)
    return option ? option.label : "Seleccionar período"
  }

  // ✅ Función para manejar la selección de período personalizado - MEJORADA
  const handleCustomDateRangeApply = () => {
    if (tempDateRange.from && tempDateRange.to) {
      // Validar que la fecha "hasta" no sea anterior a "desde"
      if (tempDateRange.to < tempDateRange.from) {
        setDateInputErrors({ to: "La fecha final no puede ser anterior a la inicial" })
        return
      }

      setCustomDateRange({ from: tempDateRange.from, to: tempDateRange.to })
      setSelectedPeriod("personalizado")
      setShowCustomDatePicker(false)
      setShowPeriodFilter(false)

      // Actualizar inputs con las fechas seleccionadas
      setFromDateInput(format(tempDateRange.from, "dd/MM/yyyy"))
      setToDateInput(format(tempDateRange.to, "dd/MM/yyyy"))
      setDateInputErrors({})
    }
  }

  // ✅ Función para resetear el período personalizado - ACTUALIZADA
  const handleCustomDateRangeReset = () => {
    setTempDateRange({})
    setCustomDateRange(null)
    setFromDateInput("")
    setToDateInput("")
    setDateInputErrors({})
    setShowCustomDatePicker(false)
  }

  // Verificar si estamos en una página de empresa
  const isCompanyPage = activeTab.startsWith("empresa-")
  const currentCompanyId = isCompanyPage ? Number.parseInt(activeTab.split("-")[1]) : null

  // Componente para la página de empresa específica
  const CompanyPage = ({ companyId }: { companyId: number }) => {
    const company = getCompanyData(companyId)
    const { facturas, loading: facturasLoading, error: facturasError } = useFacturasEmpresa(companyId)

    if (!company) return null

    // ✅ Función para filtrar facturas por período - ACTUALIZADA con soporte personalizado
    const getFilteredInvoices = () => {
      const invoices = facturas[invoiceType as keyof typeof facturas] || []

      // Aplicar filtro de período (incluyendo personalizado)
      const periodFiltered = filterInvoicesByPeriod(invoices, selectedPeriod, customDateRange || undefined)

      // Aplicar filtro de mes si está seleccionado
      if (selectedMonth === "todos") return periodFiltered
      return periodFiltered.filter((invoice) => invoice.mes === selectedMonth)
    }

    const filteredInvoices = getFilteredInvoices()

    // ✅ Calcular totales basados en el período seleccionado - ACTUALIZADO
    const totalIngresos = calculateAbsolutePeriodTotal(facturas.ingresos, selectedPeriod, customDateRange || undefined)
    const totalGastos = calculateAbsolutePeriodTotal(facturas.gastos, selectedPeriod, customDateRange || undefined)
    
    // Calcular beneficio neto usando todas las facturas juntas
    const allInvoices = [...facturas.ingresos, ...facturas.gastos]
    const beneficio = calculatePeriodTotal(allInvoices, selectedPeriod, customDateRange || undefined)

    // ✅ Calcular estadísticas generales basadas en datos reales de facturas
    // ✅ Calcular estadísticas filtradas por período basadas en datos reales - ACTUALIZADO
    const filteredIngresosForStats = filterInvoicesByPeriod(
      facturas.ingresos,
      selectedPeriod,
      customDateRange || undefined,
    )
    const filteredGastosForStats = filterInvoicesByPeriod(facturas.gastos, selectedPeriod, customDateRange || undefined)
    const allFacturasFiltradas = [...filteredIngresosForStats, ...filteredGastosForStats]
    const totalFacturasFiltradas = allFacturasFiltradas.length
    const procesadasFiltradas = allFacturasFiltradas.filter(
      (f) => f.estadoProcesamiento?.toLowerCase() === "procesado",
    ).length
    const incidenciasFiltradas = allFacturasFiltradas.filter(
      (f) => f.estadoProcesamiento?.toLowerCase() === "error",
    ).length

    // ✅ Obtener opciones de período con importes dinámicos
    const periodOptions = getPeriodOptions(facturas.ingresos, facturas.gastos)

    // ✅ Función para obtener el icono de estado de procesamiento
    const getProcessingStatusIcon = (estadoProcesamiento?: string) => {
      if (!estadoProcesamiento) {
        return <div className="h-4 w-4" /> // Espacio vacío si no hay estado
      }

      switch (estadoProcesamiento.toLowerCase()) {
        case "procesado": // Cambiar de 'procesado' a 'procesada'
          return <CheckCircle className="h-4 w-4 text-green-600" />
        case "error":
          return <AlertTriangle className="h-4 w-4 text-amber-500" />
        default:
          return <div className="h-4 w-4" /> // Espacio vacío para estados desconocidos
      }
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("empresas")}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a Empresas
                </Button>
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-lg bg-gray-900 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
                    <p className="text-xs text-gray-500">{company.cif}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button className="bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60" disabled>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Crear Libro Contable
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60"
                  disabled
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Crear Modelo
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60"
                  disabled
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar a Hacienda
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 pb-2 pt-8">
          {/* Company Info Cards - 3 cards in first 3 positions, Facturas card in last 2 positions */}
          <div className="space-y-2 mb-6">
            <div className="grid grid-cols-10 gap-3">
              <Card className="bg-white border border-gray-200">
                <CardHeader className="flex flex-row items-center justify-center space-y-0 p-2 pb-1">
                  <CardTitle className="text-xs font-medium text-gray-600 text-center">Ingresos</CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-base font-bold text-green-800">€{totalIngresos.toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardHeader className="flex flex-row items-center justify-center space-y-0 p-2 pb-1">
                  <CardTitle className="text-xs font-medium text-gray-600 text-center">Gastos</CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-base font-bold text-gray-900">€{totalGastos.toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardHeader className="flex flex-row items-center justify-center space-y-0 p-2 pb-1">
                  <CardTitle className="text-xs font-medium text-gray-600 text-center">Beneficio</CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`text-base font-bold ${beneficio >= 0 ? "text-green-800" : "text-red-600"}`}>
                      €{beneficio.toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Empty spaces - positions 4-8 */}
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>

              {/* Facturas del Período - spans last 2 columns */}
              <Card className="bg-white border border-gray-200 col-span-2">
                <CardHeader className="flex flex-row items-center justify-center space-y-0 p-2 pb-1">
                  <CardTitle className="text-xs font-medium text-gray-600 text-center">Facturas</CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <div className="flex items-center justify-center space-x-0.5 mb-0.5">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Total</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{totalFacturasFiltradas}</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-center space-x-0.5 mb-0.5">
                        <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Proc.</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{procesadasFiltradas}</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-center space-x-0.5 mb-0.5">
                        <div className="h-1.5 w-1.5 bg-red-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Rev.</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{incidenciasFiltradas}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              {/* Invoice Type Filter - stays on the left */}
              <span className="text-sm font-medium text-gray-700">Tipo:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setInvoiceType("ingresos")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    invoiceType === "ingresos"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Ingresos
                </button>
                <button
                  onClick={() => setInvoiceType("gastos")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    invoiceType === "gastos"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Gastos
                </button>
              </div>
            </div>

            {/* Nueva Factura button moved to the right */}
            <div className="flex items-center">
              <Button variant="outline" className="border-gray-300 text-gray-700 bg-transparent">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Button>
            </div>
          </div>

          {/* Loading state para facturas */}
          {facturasLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando facturas...</p>
            </div>
          )}

          {/* Error state para facturas */}
          {facturasError && (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">Error al cargar las facturas: {facturasError}</p>
            </div>
          )}

          {/* Invoices Table */}
          {!facturasLoading && !facturasError && (
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {invoiceType === "ingresos" ? "Facturas de Ingresos" : "Facturas de Gastos"} -{" "}
                  {getPeriodLabel(selectedPeriod)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden">
                  <table className="w-full" style={{ tableLayout: 'fixed' }}>
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="w-20 pl-6 pr-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                          Número
                        </th>
                        <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="w-40 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider break-words">
                          {invoiceType === "ingresos" ? "Cliente" : "Proveedor"}
                        </th>
                        <th className="w-64 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider break-words">
                          Concepto
                        </th>
                        <th className="w-24 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Importe
                        </th>
                        <th className="w-16 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="w-20 pl-3 pr-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            No hay facturas disponibles para el período seleccionado
                          </td>
                        </tr>
                      ) : (
                        filteredInvoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                            <td className="w-20 pl-6 pr-3 py-4 text-xs font-medium text-gray-900 truncate" title={invoice.numero}>
                              {invoice.numero}
                            </td>
                            <td className="w-24 px-3 py-4 text-xs text-gray-600">
                              {new Date(invoice.fecha).toLocaleDateString("es-ES")}
                            </td>
                            <td className="w-40 px-3 py-4 text-xs text-gray-900 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                              {invoice.cliente || invoice.proveedor}
                            </td>
                            <td className="w-64 px-3 py-4 text-xs text-gray-600 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                              {invoice.concepto}
                            </td>
                            <td className="w-24 px-3 py-4 text-sm font-semibold text-right">
                              <span className={invoiceType === "ingresos" ? "text-green-600" : "text-red-600"}>
                                €{invoice.importe.toLocaleString()}
                              </span>
                            </td>
                            <td className="w-16 px-3 py-4 text-center">
                              <div className="flex items-center justify-center">
                                {getProcessingStatusIcon(invoice.estadoProcesamiento)}
                              </div>
                            </td>
                            <td className="w-20 px-3 py-4 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-600 hover:text-gray-900"
                                  title="Ver factura"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-600 hover:text-gray-900"
                                  title="Descargar PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Company Details */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Información de la Empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">CIF</label>
                  <p className="text-gray-900">{company.cif}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Dirección</label>
                  <p className="text-gray-900">{company.address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Teléfono</label>
                  <p className="text-gray-900">{company.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900">{company.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Acciones Contables</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full justify-start bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60" disabled
                >
                  <BookOpen className="h-4 w-4 mr-3" />
                  Generar Libro Contable
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60" disabled
                >
                  <FileText className="h-4 w-4 mr-3" />
                  Crear Modelo 303 (IVA)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60" disabled
                >
                  <FileText className="h-4 w-4 mr-3" />
                  Crear Modelo 130 (IRPF)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60" disabled
                >
                  <Send className="h-4 w-4 mr-3" />
                  Enviar Modelos a Hacienda
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (isCompanyPage && currentCompanyId) {
    return <CompanyPage companyId={currentCompanyId} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-lg bg-gray-900 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {businessName}
                  </h1>
                  <p className="text-xs text-gray-500">Automatización Contable</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="text-gray-600 border-gray-300 bg-transparent"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pb-8">
        {/* Navigation Tabs and Overview Cards */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-8 gap-8">
            {/* Overview Cards - Horizontal on the right */}
            <div className="flex space-x-4">
              {/* Empty - all cards moved to sidebar */}
            </div>
          </div>

          <TabsContent value="empresas" className="space-y-6">
            {/* Search and Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Button
                      variant="outline"
                      onClick={() => setShowCompanyFilters(!showCompanyFilters)}
                      className="border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filtros
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                    {showCompanyFilters && (
                      <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <div className="p-4 space-y-4">
                          {/* Filtro por Estado */}
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              Filtrar por Estado
                            </label>
                            <div className="space-y-1">
                              {["todos", "pendiente", "activa", "inactiva"].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    setCompanyStatusFilter(status)
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                                    companyStatusFilter === status
                                      ? "bg-gray-100 text-gray-900 font-medium"
                                      : "text-gray-600 hover:bg-gray-50"
                                  )}
                                >
                                  {status === "todos" ? "Todos los estados" : status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Ordenar por */}
                          <div className="border-t border-gray-200 pt-4">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              Ordenar por
                            </label>
                            <div className="space-y-1">
                              {[
                                { value: "nombre", label: "Nombre" },
                                { value: "procesadas", label: "Facturas Procesadas" },
                                { value: "por-revisar", label: "Por Revisar" }
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    setCompanySortBy(option.value)
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                                    companySortBy === option.value
                                      ? "bg-gray-100 text-gray-900 font-medium"
                                      : "text-gray-600 hover:bg-gray-50"
                                  )}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Botón para cerrar */}
                          <div className="border-t border-gray-200 pt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCompanyFilters(false)}
                              className="w-full"
                            >
                              Aplicar Filtros
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {filteredCompanies.length} empresas activas de {companiesData.length} totales
                  </div>
                </div>
              </div>
            </div>

            {/* Companies Table */}
            <div className="flex w-full">
              {/* Left column - Table */}
              <div className="flex-1 min-w-0">
                <Card className="bg-white border border-gray-200 h-full">
                  <CardContent className="p-0">
                    <div className="overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Empresa
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Estado
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Procesadas
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Por Revisar
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Última Act.
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredCompanies.map((company) => (
                            <tr
                              key={company.id}
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => setActiveTab(`empresa-${company.id}`)}
                            >
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">{company.name}</div>
                              </td>
                              <td className="px-6 py-4 text-center">{getStatusBadge(company.status)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-semibold text-green-600">{company.processedInvoices}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span
                                  className={`font-semibold ${company.reviewInvoices > 0 ? "text-amber-600" : "text-gray-400"}`}
                                >
                                  {company.reviewInvoices}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center text-sm text-gray-500">{company.lastUpdate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Right column - New empty card (30% width) */}
              <div className="flex-shrink-0 ml-3 w-[30%]">
                {/* Left side - Blank space */}
              <div className="lg:col-span-2"></div>
              
              {/* Right sidebar */}
              <div className="space-y-4">
                {/* Top section - 2 columns */}
                <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
                  {/* Left column - Acciones Rápidas */}
                  <Card className="bg-white border border-gray-200 max-w-[250px]">
                    <CardHeader className="p-2 pb-1">
                      <CardTitle className="text-xs font-semibold text-gray-900 text-center">Acciones Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 pt-0">
                      <div className="space-y-1">
                        <Button
                          variant="outline"
                          className="w-full h-auto p-2 bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60 justify-center text-xs"
                          disabled
                        >
                          Barrido de Correos
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="w-full h-auto p-2 bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60 justify-center text-xs"
                          disabled
                        >
                          Barrido de Drive
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="w-full h-auto p-2 bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60 justify-center text-xs"
                          disabled
                        >
                          Revisar Incidencias
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right column - Overview Cards */}
                  <div className="space-y-4 justify-self-end">
                    <Card className="bg-white border border-gray-200 hover:shadow-sm transition-shadow max-w-[140px]" >
                      <CardHeader className="p-2 pb-1">
                        <CardTitle className="text-xs font-medium text-gray-600">Empresas Activas</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 flex justify-center">
                        <div className="flex items-center space-x-2">
                          <div className="text-xl font-bold text-gray-900">{filteredCompanies.length}</div>
                          <Building2 className="h-4 w-4 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border border-gray-200 hover:shadow-sm transition-shadow max-w-[140px]">
                      <CardHeader className="p-2 pb-1">
                        <CardTitle className="text-xs font-medium text-gray-600">Facturas Procesadas</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 flex justify-center">
                        <div className="flex items-center space-x-2">
                          <div className="text-xl font-bold text-gray-900">
                            {filteredCompanies.reduce((sum, company) => sum + company.processedInvoices, 0)}
                          </div>
                          <CheckCircle className="h-4 w-4 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border border-gray-200 hover:shadow-sm transition-shadow max-w-[140px]">
                      <CardHeader className="p-2 pb-1">
                        <CardTitle className="text-xs font-medium text-gray-600">Por Revisar</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 flex justify-center">
                        <div className="flex items-center space-x-2">
                          <div className="text-xl font-bold text-gray-900">
                            {filteredCompanies.reduce((sum, company) => sum + company.reviewInvoices, 0)}
                          </div>
                          <AlertTriangle className="h-4 w-4 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Bottom section - Full width Actividad Reciente */}
                <Card className="bg-white border border-gray-200">
                  <CardHeader className="p-4">
                    <CardTitle className="text-base font-semibold text-gray-900">Actividad Reciente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {logsLoading ? (
                      <div className="text-center py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mx-auto mb-2"></div>
                        <p className="text-xs text-gray-600">Cargando actividad...</p>
                      </div>
                    ) : logsError ? (
                      <div className="text-center py-2">
                        <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-2" />
                        <p className="text-xs text-red-600">Error al cargar la actividad</p>
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="text-center py-2">
                        <p className="text-xs text-gray-500">No hay actividad reciente</p>
                      </div>
                    ) : (
                      <div
                        onScroll={handleActivityScroll}
                        ref={activityContainerRef}
                        className={cn(
                          "recent-activity-scroll space-y-2 text-xs h-32 lg:h-40 overflow-x-auto pr-3",
                          isActivityScrolling && "scrolling",
                        )}
                      >
                        <div className="min-w-max space-y-2">
                          {logs.slice(0, 20).map((log) => (
                            <div key={log.id} className="flex items-center space-x-2">
                              <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              <div className="whitespace-nowrap">
                                {log.log || "Actividad del sistema"}
                              </div>
                              <span className="text-gray-500 whitespace-nowrap flex-shrink-0">
                                {log.timeAgo}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="integraciones" className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Integraciones</h2>
                <p className="text-gray-600">Conecta tus plataformas para automatizar la recepción de facturas</p>
              </div>
              <div className="flex items-center gap-2">
                <Button className="bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60" disabled>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar Todo
                </Button>
                <ConnectGoogleButton connected={googleConnected} />
              </div>
            </div>

            {/* Integration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((integration) => {
                const IconComponent = integration.icon
                return (
                  <Card
                    key={integration.id}
                    className="bg-white border border-gray-200 hover:shadow-sm transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`h-10 w-10 rounded-lg ${integration.bgColor} flex items-center justify-center`}
                          >
                            <IconComponent className={`h-5 w-5 ${integration.color}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                            {getIntegrationStatusBadge(integration.status)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 mb-4">{integration.description}</p>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Última sincronización:</span>
                          <span className="text-gray-900">{integration.lastSync}</span>
                        </div>
                        {integration.status === "connected" && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Facturas encontradas:</span>
                            <span className="font-semibold text-green-600">{integration.invoicesFound}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        {integration.status === "connected" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60"
                              disabled
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Configurar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60"
                              disabled
                            >
                              Desconectar
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            className="flex-1 bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60"
                            disabled
                          >
                            <Plug className="h-4 w-4 mr-2" />
                            Conectar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Automation Settings */}
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Configuración de Automatización</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-medium text-gray-900">Lectura Automática de Correos</h3>
                      <p className="text-sm text-gray-500">Escanear correos cada 15 minutos en busca de facturas</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60"
                      disabled
                    >
                      Configurar
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-medium text-gray-900">Descarga Automática</h3>
                      <p className="text-sm text-gray-500">Descargar automáticamente archivos PDF y XML detectados</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60"
                      disabled
                    >
                      Configurar
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-medium text-gray-900">Filtros Inteligentes</h3>
                      <p className="text-sm text-gray-500">
                        Configurar reglas para identificar facturas automáticamente
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60"
                      disabled
                    >
                      Configurar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidencias" className="space-y-6">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Incidencias Activas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {incidentsData.map((incident) => (
                    <div
                      key={incident.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`h-3 w-3 rounded-full ${
                            incident.severity === "high"
                              ? "bg-red-500"
                              : incident.severity === "medium"
                                ? "bg-amber-500"
                                : "bg-yellow-500"
                          }`}
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">{incident.type}</h3>
                          <p className="text-sm text-gray-600">{incident.company}</p>
                          <p className="text-sm text-gray-500">{incident.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-2 border-gray-300">
                          {incident.action}
                        </Badge>
                        <div className="text-xs text-gray-500">
                          {incident.severity === "high"
                            ? "Alta prioridad"
                            : incident.severity === "medium"
                              ? "Media prioridad"
                              : "Baja prioridad"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configuracion" className="space-y-6">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Configuración del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-medium text-gray-900">Importación Automática</h3>
                      <p className="text-sm text-gray-500">Procesar facturas automáticamente cada hora</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60"
                      disabled
                    >
                      Configurar
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-medium text-gray-900">Notificaciones</h3>
                      <p className="text-sm text-gray-500">Alertas por email y sistema</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60"
                      disabled
                    >
                      Configurar
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-medium text-gray-900">Usuarios y Permisos</h3>
                      <p className="text-sm text-gray-500">Gestionar acceso al sistema</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-gray-400 hover:bg-gray-400 text-gray-300 cursor-not-allowed opacity-60"
                      disabled
                    >
                      Configurar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
