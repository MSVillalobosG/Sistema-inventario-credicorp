'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Paper, Typography } from '@mui/material'
import { getDevices } from '@/services/devices'

type Device = {
  id: number
  sede?: string | null
  usuario_asignado?: string | null
  estado?: string | null
  origen?: string | null
}

function normalizeState(d: Device) {
  const estado = (d.estado || '').toUpperCase()
  const origen = (d.origen || '').toUpperCase()
  const asignado = !!d.usuario_asignado
  if (estado === 'CAMBIO_PENDIENTE') return 'CAMBIO_PENDIENTE'
  if (estado === 'ASIGNADO' || asignado) return 'ASIGNADO'
  if (estado === 'EN_BODEGA') return 'EN_BODEGA'
  if (estado === 'DE_BAJA' || origen === 'BAJA') return 'BAJA'
  return estado || 'OTROS'
}

export default function InventoryDashboardSnapshot() {
  const [devices, setDevices] = useState<Device[]>([])
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const data = await getDevices()
      setDevices(Array.isArray(data) ? data : [])
      setUpdatedAt(new Date())
      setError('')
    } catch {
      setError('No se pudo cargar el inventario')
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  const stats = useMemo(() => {
    const n = devices.map((d) => ({ ...d, estadoN: normalizeState(d), asignado: !!d.usuario_asignado }))
    const total = n.length
    const asignados = n.filter((d) => d.asignado).length
    const enBodega = n.filter((d) => !d.asignado && d.estadoN === 'EN_BODEGA').length
    const cambio = n.filter((d) => d.estadoN === 'CAMBIO_PENDIENTE').length
    const baja = n.filter((d) => d.estadoN === 'BAJA').length
    const sinSede = n.filter((d) => !(d.sede || '').trim()).length
    const tasa = total ? Math.round((asignados / total) * 100) : 0
    return { total, asignados, enBodega, cambio, baja, sinSede, tasa }
  }, [devices])

  const pill = (label: string, value: number | string, emphasize?: 'warning' | 'error') => (
    <Paper
      elevation={0}
      sx={{
        px: 2,
        py: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: emphasize ? 4 : 1,
        borderLeftColor: emphasize === 'warning' ? 'warning.main' : emphasize === 'error' ? 'error.main' : 'divider',
        borderRadius: 2,
        minWidth: { xs: '100%', sm: 140 },
        flex: '1 1 140px',
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} color="primary" sx={{ mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  )

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="h5" fontWeight={700}>
          Resumen operativo
        </Typography>
        {updatedAt && (
          <Typography variant="caption" color="text.secondary">
            Actualizado: {updatedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{' '}
            · auto cada 60s
          </Typography>
        )}
      </Box>
      {error && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {pill('Total equipos', stats.total)}
        {pill('Asignados', `${stats.asignados} (${stats.tasa}%)`)}
        {pill('En bodega (libre)', stats.enBodega)}
        {pill('Cambio pendiente', stats.cambio, stats.cambio > 0 ? 'warning' : undefined)}
        {pill('Baja', stats.baja, stats.baja > 0 ? 'error' : undefined)}
        {pill('Sin sede', stats.sinSede, stats.sinSede > 0 ? 'warning' : undefined)}
      </Box>
    </Box>
  )
}
