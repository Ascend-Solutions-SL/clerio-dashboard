"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, RefreshCw, Plus, Building2 } from 'lucide-react'
import { useSupabase, useFacturasEmpresa } from "@/hooks/use-supabase"

export default function TestSupabasePage() {
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number>(0)
  const [newFactura, setNewFactura] = useState({
    numero: "",
    fecha: "",
    cliente_proveedor: "",
    concepto: "",
    importe_sin_iva: "",
    estado: "pendiente",
    tipo: "ingreso" as "ingreso" | "gasto",
  })

  // Usar el hook principal de Supabase
  const {
    empresas,
    loading: empresasLoading,
    error: empresasError,
    refresh: refreshEmpresas,
    addFactura,
  } = useSupabase()

  // Usar el hook específico para facturas de la empresa seleccionada
  const {
    facturas,
    loading: facturasLoading,
    error: facturasError,
    refresh: refreshFacturas,
  } = useFacturasEmpresa(selectedEmpresaId)

  const handleAddFactura = async () => {
    if (!selectedEmpresaId || selectedEmpresaId === 0) {
      alert("Por favor selecciona una empresa")
      return
    }

    if (!newFactura.numero || !newFactura.fecha || !newFactura.concepto || !newFactura.importe_sin_iva) {
      alert("Por favor completa todos los campos obligatorios")
      return
    }

    const facturaData = {
      empresa_id: selectedEmpresaId,
      numero: newFactura.numero,
      fecha: newFactura.fecha,
      cliente_proveedor: newFactura.cliente_proveedor,
      concepto: newFactura.concepto,
      importe: Number.parseFloat(newFactura.importe_sin_iva),
      estado: newFactura.estado,
      tipo: newFactura.tipo === "ingreso" ? "ingresos" : "gastos",
    }

    const result = await addFactura(facturaData)

    if (result.success) {
      alert("Factura agregada exitosamente")
      setNewFactura({
        numero: "",
        fecha: "",
        cliente_proveedor: "",
        concepto: "",
        importe_sin_iva: "",
        estado: "pendiente",
        tipo: "ingreso",
      })
      // Refrescar facturas para mostrar la nueva
      refreshFacturas()
    } else {
      alert(`Error al agregar factura: ${result.error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Supabase Connection</h1>
          <p className="text-gray-600">Prueba la conexión con la base de datos y las operaciones CRUD</p>
        </div>

        {/* Test Empresas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Test Tabla Empresas</span>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshEmpresas}
                disabled={empresasLoading}
                className="ml-auto bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${empresasLoading ? "animate-spin" : ""}`} />
                Refrescar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {empresasLoading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-gray-600">Cargando empresas...</p>
              </div>
            )}

            {empresasError && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg">
                <AlertTriangle className="h-5 w-5" />
                <span>Error: {empresasError}</span>
              </div>
            )}

            {!empresasLoading && !empresasError && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span>Conexión exitosa. {empresas.length} empresas encontradas.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {empresas.map((empresa) => (
                    <div key={empresa.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <h3 className="font-semibold text-gray-900">{empresa.name}</h3>
                      <p className="text-sm text-gray-600">ID: {empresa.id}</p>
                      <p className="text-sm text-gray-600">CIF: {empresa.cif}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="secondary">{empresa.status}</Badge>
                        <div className="text-xs text-gray-500">
                          Pendientes: {empresa.pendingInvoices} | Procesadas: {empresa.categorizedInvoices}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Facturas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Test Tabla Facturas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selector de empresa */}
            <div className="space-y-2">
              <Label htmlFor="empresa-select">Seleccionar Empresa</Label>
              <Select
                value={selectedEmpresaId.toString()}
                onValueChange={(value) => setSelectedEmpresaId(Number.parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">-- Seleccionar empresa --</SelectItem>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id.toString()}>
                      {empresa.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Formulario para agregar factura */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 rounded-lg">
              <h3 className="col-span-full font-semibold text-gray-900 mb-2">Agregar Nueva Factura</h3>

              <div className="space-y-2">
                <Label htmlFor="numero">Número de Factura *</Label>
                <Input
                  id="numero"
                  value={newFactura.numero}
                  onChange={(e) => setNewFactura({ ...newFactura, numero: e.target.value })}
                  placeholder="Ej: FAC-2024-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={newFactura.fecha}
                  onChange={(e) => setNewFactura({ ...newFactura, fecha: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_proveedor">Cliente/Proveedor</Label>
                <Input
                  id="cliente_proveedor"
                  value={newFactura.cliente_proveedor}
                  onChange={(e) => setNewFactura({ ...newFactura, cliente_proveedor: e.target.value })}
                  placeholder="Nombre del cliente o proveedor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="concepto">Concepto *</Label>
                <Input
                  id="concepto"
                  value={newFactura.concepto}
                  onChange={(e) => setNewFactura({ ...newFactura, concepto: e.target.value })}
                  placeholder="Descripción del servicio/producto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="importe">Importe (sin IVA) *</Label>
                <Input
                  id="importe"
                  type="number"
                  step="0.01"
                  value={newFactura.importe_sin_iva}
                  onChange={(e) => setNewFactura({ ...newFactura, importe_sin_iva: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={newFactura.tipo}
                  onValueChange={(value: "ingreso" | "gasto") => setNewFactura({ ...newFactura, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                    <SelectItem value="gasto">Gasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={newFactura.estado}
                  onValueChange={(value) => setNewFactura({ ...newFactura, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="pagada">Pagada</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-full">
                <Button onClick={handleAddFactura} className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Factura
                </Button>
              </div>
            </div>

            {/* Mostrar facturas de la empresa seleccionada */}
            {selectedEmpresaId > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    Facturas de {empresas.find((e) => e.id === selectedEmpresaId)?.name}
                  </h3>
                  <Button variant="outline" size="sm" onClick={refreshFacturas} disabled={facturasLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${facturasLoading ? "animate-spin" : ""}`} />
                    Refrescar
                  </Button>
                </div>

                {facturasLoading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    <p className="text-gray-600">Cargando facturas...</p>
                  </div>
                )}

                {facturasError && (
                  <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Error: {facturasError}</span>
                  </div>
                )}

                {!facturasLoading && !facturasError && (
                  <div className="space-y-4">
                    {/* Ingresos */}
                    <div>
                      <h4 className="font-medium text-green-600 mb-2">Ingresos ({facturas.ingresos.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {facturas.ingresos.map((factura) => (
                          <div key={factura.id} className="border border-green-200 rounded-lg p-3 bg-green-50">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-gray-900">{factura.numero}</span>
                              <Badge variant="secondary">{factura.estado}</Badge>
                            </div>
                            <p className="text-sm text-gray-600">{factura.concepto}</p>
                            <p className="text-sm text-gray-500">Cliente: {factura.cliente}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-sm text-gray-500">
                                {new Date(factura.fecha).toLocaleDateString("es-ES")}
                              </span>
                              <span className="font-semibold text-green-600">€{factura.importe.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {facturas.ingresos.length === 0 && (
                        <p className="text-gray-500 text-sm">No hay facturas de ingresos</p>
                      )}
                    </div>

                    {/* Gastos */}
                    <div>
                      <h4 className="font-medium text-red-600 mb-2">Gastos ({facturas.gastos.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {facturas.gastos.map((factura) => (
                          <div key={factura.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-gray-900">{factura.numero}</span>
                              <Badge variant="secondary">{factura.estado}</Badge>
                            </div>
                            <p className="text-sm text-gray-600">{factura.concepto}</p>
                            <p className="text-sm text-gray-500">Proveedor: {factura.proveedor}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-sm text-gray-500">
                                {new Date(factura.fecha).toLocaleDateString("es-ES")}
                              </span>
                              <span className="font-semibold text-red-600">€{factura.importe.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {facturas.gastos.length === 0 && (
                        <p className="text-gray-500 text-sm">No hay facturas de gastos</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
