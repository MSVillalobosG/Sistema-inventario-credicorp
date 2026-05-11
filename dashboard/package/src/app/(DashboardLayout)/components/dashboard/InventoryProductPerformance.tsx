import { useEffect, useMemo, useState } from 'react'
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
} from '@mui/material'
import { getDevices } from '@/services/devices'

type Device = {
  id: number
  placa_equipo?: string | null
  sede?: string | null
  usuario_asignado?: string | null
  estado?: string | null
  origen?: string | null
}

const labelForState = (d: Device) => {
  const estado = (d.estado || '').toUpperCase()
  const origen = (d.origen || '').toUpperCase()

  if (estado === 'CAMBIO_PENDIENTE') return { label: 'CAMBIO', color: 'warning' }
  if (estado === 'DE_BAJA' || origen === 'BAJA') return { label: 'BAJA', color: 'error' }
  if (estado === 'ASIGNADO' || d.usuario_asignado) return { label: 'ASIGNADO', color: 'primary' }
  if (estado === 'EN_BODEGA') return { label: 'EN BODEGA', color: 'success' }
  return { label: estado || 'SIN_ESTADO', color: 'default' }
}

export default function InventoryProductPerformance() {
  const [devices, setDevices] = useState<Device[]>([])

  useEffect(() => {
    const load = async () => {
      const data = await getDevices()
      setDevices(data)
    }
    load()
  }, [])

  const rows = useMemo(() => {
    return [...devices].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 6)
  }, [devices])

  return (
    <DashboardCard title="Inventario - Tabla" >
      <Box sx={{ overflow: 'auto', width: { xs: '280px', sm: 'auto' } }}>
        <Table sx={{ whiteSpace: 'nowrap', mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  ID
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Placa
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Sede
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Usuario
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Estado
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((d) => {
              const s = labelForState(d)
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                      {d.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>
                      {d.placa_equipo || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography color="text.secondary" variant="body2">
                      {d.sede || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {d.usuario_asignado || 'Sin asignar'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={s.label}
                      color={s.color}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>
    </DashboardCard>
  )
}

