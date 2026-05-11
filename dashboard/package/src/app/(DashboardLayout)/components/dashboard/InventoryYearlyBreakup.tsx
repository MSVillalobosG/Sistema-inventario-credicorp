import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from '@mui/material/styles'
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard'
import { Grid, Typography } from '@mui/material'
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

export default function InventoryYearlyBreakup() {
  const theme = useTheme()
  const primary = theme.palette.primary.main
  const primarylight = theme.palette.primary.light

  const [devices, setDevices] = useState<Device[]>([])

  useEffect(() => {
    const load = async () => {
      const data = await getDevices()
      setDevices(data)
    }
    load()
  }, [])

  const { series } = useMemo(() => {
    const buckets: Record<string, number> = {
      EN_BODEGA: 0,
      ASIGNADO: 0,
      CAMBIO_PENDIENTE: 0,
      BAJA: 0,
    }

    for (const d of devices) {
      const key = normalizeState(d)
      if (buckets[key] !== undefined) buckets[key] += 1
    }

    return {
      labels: ['EN_BODEGA', 'ASIGNADO', 'CAMBIO_PENDIENTE', 'BAJA'],
      series: [buckets.EN_BODEGA, buckets.ASIGNADO, buckets.CAMBIO_PENDIENTE, buckets.BAJA],
    }
  }, [devices])

  const options: any = {
    chart: {
      type: 'donut',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: '#adb0bb',
      toolbar: { show: false },
      height: 155,
    },
    colors: [primary, primarylight, '#F9F9FD', theme.palette.secondary.main],
    plotOptions: {
      pie: {
        startAngle: 0,
        endAngle: 360,
        donut: {
          size: '75%',
          background: 'transparent',
        },
      },
    },
    tooltip: {
      theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
      fillSeriesColor: false,
    },
    stroke: { show: false },
    dataLabels: { enabled: false },
    legend: { show: false },
  }

  const total = series.reduce((a, b) => a + b, 0)

  return (
    <DashboardCard title="Inventario - Distribución">
      <Grid container spacing={3}>
        <Grid size={{ xs: 7, sm: 7 }}>
          <Typography variant="h3" fontWeight="700">
            {total}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Equipos totales
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" mt={2}>
            Por estado / origen
          </Typography>
        </Grid>
        <Grid size={{ xs: 5, sm: 5 }}>
          <Chart options={options} series={series} type="donut" height={150} width="100%" />
        </Grid>
      </Grid>
    </DashboardCard>
  )
}

