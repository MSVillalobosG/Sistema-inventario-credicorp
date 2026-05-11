import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from '@mui/material/styles'
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

export default function InventorySalesOverview() {
  const theme = useTheme()
  const primary = theme.palette.primary.main
  const secondary = theme.palette.secondary.main

  const [devices, setDevices] = useState<Device[]>([])

  useEffect(() => {
    const load = async () => {
      const data = await getDevices()
      setDevices(data)
    }
    load()
  }, [])

  const { categories, values } = useMemo(() => {
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
      categories: ['EN_BODEGA', 'ASIGNADO', 'CAMBIO_PENDIENTE', 'BAJA'],
      values: [buckets.EN_BODEGA, buckets.ASIGNADO, buckets.CAMBIO_PENDIENTE, buckets.BAJA],
    }
  }, [devices])

  const options: any = {
    chart: {
      type: 'bar',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: '#adb0bb',
      toolbar: { show: true },
      height: 370,
    },
    colors: [primary, secondary],
    plotOptions: {
      bar: {
        horizontal: false,
        barHeight: '60%',
        columnWidth: '42%',
        borderRadius: [6],
      },
    },
    stroke: { show: true, width: 5, lineCap: 'butt', colors: ['transparent'] },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: {
      borderColor: 'rgba(0,0,0,0.1)',
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
    },
    yaxis: { tickAmount: 4 },
    xaxis: { categories, axisBorder: { show: false } },
    tooltip: { theme: 'dark', fillSeriesColor: false },
  }

  const series: any = [{ name: 'Equipos', data: values }]

  return (
    <DashboardCard title="Inventario por Estado">
      <Chart options={options} series={series} type="bar" height={370} width={'100%'} />
    </DashboardCard>
  )
}

