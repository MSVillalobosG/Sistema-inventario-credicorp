'use client'

import { useEffect, useState } from "react"
import { Box, Typography, Paper } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { getDevices } from "@/services/devices"

type Device = {
  id: number
  sede?: string
  usuario_asignado?: string | null
  usuario_responsable?: string | null
  estado?: string
  origen?: string
  [key: string]: any
}

export default function EquiposBajaPage() {
  const [devices, setDevices] = useState<Device[]>([])

  useEffect(() => {
    const load = async () => {
      const data = await getDevices()
      setDevices(data)
    }
    load()
  }, [])

  const bajaDevices = devices.filter((d) => {
    const estado = (d.estado || "").toUpperCase()
    const origen = (d.origen || "").toUpperCase()
    return estado === "DE_BAJA" || origen === "BAJA"
  })

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 90 },
    { field: "sede", headerName: "SEDE", minWidth: 150 },
    { field: "placa_equipo", headerName: "PLACA EQUIPO", minWidth: 160 },
    { field: "usuario_responsable", headerName: "USUARIO (PROVIENE)", minWidth: 220 },
    { field: "estado", headerName: "ESTADO", minWidth: 140 },
    { field: "origen", headerName: "ORIGEN", minWidth: 140 },
    { field: "marca", headerName: "MARCA", minWidth: 150 },
    { field: "modelo", headerName: "MODELO", minWidth: 150 },
    { field: "sistema_operativo", headerName: "SISTEMA OPERATIVO", minWidth: 200 },
    { field: "tipo_procesador", headerName: "PROCESADOR", minWidth: 200 },
    { field: "capacidad_ram", headerName: "RAM", minWidth: 120 },
    { field: "tipo_ram", headerName: "TIPO RAM", minWidth: 120 },
    { field: "tipo_disco", headerName: "TIPO DISCO", minWidth: 150 },
    { field: "capacidad_disco", headerName: "CAPACIDAD DISCO", minWidth: 150 },
  ]

  return (
    <Box sx={{ p: 4, height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Equipos de Baja
      </Typography>

      <Paper sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <DataGrid
          rows={bajaDevices}
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
  )
}

