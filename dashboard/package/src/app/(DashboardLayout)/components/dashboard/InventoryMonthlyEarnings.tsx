import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from '@mui/material/styles'
import { Box, Fab, Typography, Avatar, Stack } from '@mui/material'
import { IconArrowDownRight, IconBox } from '@tabler/icons-react'
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard'
import { getDevices } from '@/services/devices'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type Device = {
  estado?: string | null
  origen?: string | null
  usuario_asignado?: string | null
}

const normalizeState = (d: Device) => {
  const estado = (d.estado || '').toUpperCase()
  const origen = (d.origen || '').toUpperCase()
  const asignado = !!d.usuario_asignado

  if (estado === 'CAMBIO_PENDIENTE') return 'CAMBIO_PENDIENTE'
  if (estado === 'ASIGNADO' || asignado) return 'ASIGNADO'
  if (estado === 'EN_BODEGA') return 'EN_BODEGA'
  if (estado === 'DE_BAJA' || origen === 'BAJA') return 'BAJA'
  return estado || 'DESCONOCIDO'
}

export default function InventoryMonthlyEarnings() {
  const theme = useTheme()
  const secondary = theme.palette.secondary.main
  const secondarylight = '#f5fcff'
  const errorlight = '#fdede8'

  const [devices, setDevices] = useState<Device[]>([])

  useEffect(() => {
    const load = async () => {
      const data = await getDevices()
      setDevices(data)
    }
    load()
  }, [])

  const { categories, total, assigned } = useMemo(() => {
    const cats = ['EN_BODEGA', 'ASIGNADO', 'CAMBIO_PENDIENTE', 'BAJA']
    const bucketsTotal: Record<string, number> = {}
    const bucketsAssigned: Record<string, number> = {}
    for (const c of cats) {
      bucketsTotal[c] = 0
      bucketsAssigned[c] = 0
    }

    for (const d of devices) {
      const key = normalizeState(d)
      if (bucketsTotal[key] !== undefined) {
        bucketsTotal[key] += 1
        if (!!d.usuario_asignado) bucketsAssigned[key] += 1
      }
    }

    return {
      categories: cats,
      total: cats.map((c) => bucketsTotal[c]),
      assigned: cats.map((c) => bucketsAssigned[c]),
    }
  }, [devices])

  const options: any = {
    chart: {
      type: 'area',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: '#adb0bb',
      toolbar: { show: false },
      height: 60,
      sparkline: { enabled: true },
    },
    stroke: { curve: 'smooth', width: 2 },
    fill: { colors: [secondarylight], type: 'solid', opacity: 0.05 },
    markers: { size: 0 },
    tooltip: { theme: theme.palette.mode === 'dark' ? 'dark' : 'light' },
    xaxis: { categories, labels: { show: false } },
    legend: { show: false },
  }

  const series: any = [
    { name: 'Total', color: secondary, data: total },
    { name: 'Asignados', color: theme.palette.primary.main, data: assigned },
  ]

  const lastTotal = total.reduce((a, b) => a + b, 0)

  return (
    <DashboardCard
      title="Inventario - Vista general"
      action={
        <Fab color="secondary" size="medium" sx={{ color: '#ffffff' }}>
          <IconBox width={24} />
        </Fab>
      }
      footer={
        <Box sx={{ px: 2, pb: 1 }}>
          <Chart options={options} series={series} type="area" height={60} width={'100%'} />
        </Box>
      }
    >
      <Typography variant="h3" fontWeight="700" mt="-20px">
        {lastTotal}
      </Typography>
      <Stack direction="row" spacing={1} my={1} alignItems="center">
        <Avatar sx={{ bgcolor: errorlight, width: 27, height: 27 }}>
          <IconArrowDownRight width={20} color="#FA896B" />
        </Avatar>
        <Typography variant="subtitle2" fontWeight="600">
          Actual
        </Typography>
        <Typography variant="subtitle2" color="textSecondary">
          estados del inventario
        </Typography>
      </Stack>
    </DashboardCard>
  )
}

