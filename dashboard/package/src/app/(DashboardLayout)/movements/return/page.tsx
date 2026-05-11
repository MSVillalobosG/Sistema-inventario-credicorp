'use client'

import { useEffect, useState } from "react"
import { Alert, Box, Typography, Paper, Button } from "@mui/material"
import { alpha } from "@mui/material/styles"
import InventoryPageShell from '@/app/(DashboardLayout)/components/shared/InventoryPageShell'
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { getDevices } from "@/services/devices"
import { fetcher } from "@/services/api"
import { canWriteInventory } from "@/services/auth"

type Device = {
  id: number
  sede?: string
  usuario_asignado?: string | null
  usuario_responsable?: string | null
  estado?: string
  origen?: string
  placa_equipo?: string
  [key: string]: any
}

export default function EquiposCambioPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const canWrite = canWriteInventory()

  const loadDevices = async () => {
    const data = await getDevices()
    setDevices(data)
  }

  useEffect(() => {
    loadDevices()
  }, [])

  const cambioDevices = devices.filter((d) => {
    const estado = (d.estado || "").toUpperCase()
    const sinAsignar = !d.usuario_asignado

    // Solo equipos en CAMBIO_PENDIENTE y sin asignar (decisión pendiente)
    return estado === "CAMBIO_PENDIENTE" && sinAsignar
  })

  const handleAccion = async (device: Device, accion: "REASIGNAR" | "BAJA") => {
    if (!canWrite) {
      alert("Su cuenta solo tiene permiso de visualización.")
      return
    }
    if (!device.placa_equipo) {
      alert("El equipo no tiene placa registrada")
      return
    }

    const mensaje =
      accion === "BAJA"
        ? `¿Confirmas dar de baja el equipo ${device.placa_equipo}?`
        : `¿Confirmas enviar el equipo ${device.placa_equipo} a reasignación (bodega)?`

    const ok = window.confirm(mensaje)
    if (!ok) return

    try {
      setLoadingId(device.id)

      const q = new URLSearchParams({
        placa: device.placa_equipo,
        accion,
      })
      await fetcher(`/devices/return-device?${q.toString()}`, { method: "PUT" })

      if (accion === "BAJA") {
        alert("Equipo dado de baja correctamente")
      } else {
        alert("Equipo enviado a reasignación correctamente")
      }

      await loadDevices()
    } catch (e: any) {
      alert(e?.message || "Error procesando la acción")
    } finally {
      setLoadingId(null)
    }
  }

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "sede", headerName: "SEDE", minWidth: 120 },
    { field: "placa_equipo", headerName: "PLACA EQUIPO", minWidth: 140 },
    {
      field: "usuario_responsable",
      headerName: "USUARIO AL QUE SE LE CAMBIÓ",
      minWidth: 220,
    },
    { field: "estado", headerName: "ESTADO", minWidth: 140 },
    { field: "origen", headerName: "ORIGEN", minWidth: 140 },
    { field: "marca", headerName: "MARCA", minWidth: 140 },
    { field: "modelo", headerName: "MODELO", minWidth: 140 },
    {
      field: "acciones",
      headerName: "ACCIONES",
      minWidth: 260,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            disabled={!canWrite || loadingId === params.row.id}
            onClick={() => handleAccion(params.row, "REASIGNAR")}
          >
            Reasignar
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            disabled={!canWrite || loadingId === params.row.id}
            onClick={() => handleAccion(params.row, "BAJA")}
          >
            Dar de baja
          </Button>
        </Box>
      ),
    },
  ]

  return (
    <InventoryPageShell
      title="Equipos en cambio pendiente"
      description="Equipos en estado cambio pendiente sin asignar: reasignar a bodega o dar de baja."
    >
      <Box sx={{ height: "calc(100vh - 220px)", minHeight: 360, display: "flex", flexDirection: "column" }}>

      {!canWrite && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Su cuenta tiene permiso de <strong>solo visualización</strong>. No puede reasignar ni dar de baja
          equipos. Inicie sesión con una cuenta de editor o administrador para operar.
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          boxShadow: (t) => `0 12px 40px ${alpha(t.palette.common.black, 0.06)}`,
        }}
      >
        <DataGrid
          rows={cambioDevices}
          columns={columns}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          sx={{ flex: 1 }}
        />
      </Paper>
      </Box>
    </InventoryPageShell>
  )
}
