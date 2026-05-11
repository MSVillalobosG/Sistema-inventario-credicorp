'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from '@mui/material/styles'
import { Alert, Box, CircularProgress, Grid, LinearProgress, Paper, Typography } from '@mui/material'
import { getDevices } from '@/services/devices'
import {
  GFT_ACCENT,
  GFT_ACCENT_LIGHT,
  GFT_PRIMARY,
  GFT_PRIMARY_DARK,
  GFT_PRIMARY_LIGHT,
} from '@/utils/theme/DefaultColors'
import {
  buildSedeChartTop10,
  computeDeviceAnalytics,
  type Device,
} from '@/utils/deviceAnalytics'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const SEDE_BAR_PALETTE = [
  GFT_PRIMARY_DARK,
  GFT_PRIMARY,
  GFT_ACCENT,
  GFT_ACCENT,
  GFT_PRIMARY_LIGHT,
  GFT_ACCENT_LIGHT,
  '#B8C9E8',
  '#9EB5E0',
  '#7A93C9',
  '#5C78D3',
]

const ORIGEN_BAR_COLORS = [GFT_PRIMARY_DARK, GFT_PRIMARY, GFT_ACCENT, GFT_ACCENT_LIGHT, GFT_PRIMARY_LIGHT]

type Props = {
  /** Historial u otro panel al lado del gráfico de marcas */
  bottomAside?: ReactNode
}

export default function InventoryMainCharts({ bottomAside }: Props) {
  const theme = useTheme()
  const primary = theme.palette.primary.main
  const secondary = theme.palette.secondary.main
  const primaryLight = theme.palette.primary.light

  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDevices()
        setDevices(Array.isArray(data) ? data : [])
        setError('')
      } catch {
        setDevices([])
        setError('No se pudo cargar el inventario')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const analytics = useMemo(() => computeDeviceAnalytics(devices), [devices])

  const sedeChart = useMemo(
    () => buildSedeChartTop10(analytics.sedeRows),
    [analytics.sedeRows]
  )

  const sedeBarColors = useMemo(() => {
    const n = sedeChart.values.length || 1
    return Array.from({ length: n }, (_, i) => SEDE_BAR_PALETTE[i % SEDE_BAR_PALETTE.length])
  }, [sedeChart.values.length])

  const optionsSedes: Record<string, unknown> = useMemo(
    () => ({
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: theme.typography.fontFamily },
      colors: sedeBarColors,
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '70%',
          borderRadius: 4,
          distributed: true,
          dataLabels: { position: 'center' },
        },
      },
      dataLabels: {
        enabled: true,
        style: { colors: ['#fff'], fontWeight: 600 },
        dropShadow: { enabled: false },
      },
      xaxis: {
        categories: sedeChart.categories,
        labels: { style: { colors: theme.palette.text.secondary } },
      },
      yaxis: { labels: { style: { colors: theme.palette.text.secondary } } },
      grid: { borderColor: theme.palette.divider, strokeDashArray: 4 },
      tooltip: { theme: 'light' },
      legend: { show: false },
    }),
    [sedeChart.categories, sedeBarColors, theme]
  )

  const estadoDonutColors = useMemo(() => {
    const base = [primary, secondary, primaryLight, theme.palette.error.main, theme.palette.warning.main, '#90A4C4']
    return base.slice(0, Math.max(analytics.estadoLabels.length, 1))
  }, [analytics.estadoLabels.length, primary, primaryLight, secondary, theme])

  const optionsEstados: Record<string, unknown> = useMemo(
    () => ({
      chart: { type: 'donut', fontFamily: theme.typography.fontFamily },
      labels: analytics.estadoLabels,
      colors: estadoDonutColors,
      legend: { position: 'bottom', fontWeight: 500 },
      plotOptions: {
        pie: {
          donut: { size: '68%' },
        },
      },
      dataLabels: { enabled: true },
      tooltip: { theme: 'light' },
    }),
    [analytics.estadoLabels, estadoDonutColors, theme.typography.fontFamily]
  )

  const optionsMarcas: Record<string, unknown> = useMemo(
    () => ({
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: theme.typography.fontFamily },
      colors: [GFT_ACCENT],
      plotOptions: { bar: { columnWidth: '52%', borderRadius: 4 } },
      dataLabels: { enabled: false },
      xaxis: {
        categories: analytics.topMarcas.map(([m]) => (m.length > 18 ? `${m.slice(0, 16)}…` : m)),
        labels: { rotate: -20, style: { colors: theme.palette.text.secondary } },
      },
      yaxis: { labels: { style: { colors: theme.palette.text.secondary } } },
      grid: { borderColor: theme.palette.divider, strokeDashArray: 4 },
      tooltip: { theme: 'light' },
    }),
    [analytics.topMarcas, theme]
  )

  const origenSorted = useMemo(
    () => Object.entries(analytics.porOrigen).sort((a, b) => b[1] - a[1]),
    [analytics.porOrigen]
  )

  const cardSx = {
    p: 2.5,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    height: '100%',
    boxShadow: 'rgb(145 158 171 / 12%) 0px 0px 2px 0px, rgb(145 158 171 / 8%) 0px 12px 24px -4px',
    bgcolor: 'background.paper',
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="warning">{error}</Alert>
  }

  const empty = analytics.total === 0

  return (
    <>
      {empty && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No hay equipos registrados todavía.
        </Alert>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 3,
        }}
      >
        <Paper elevation={0} sx={cardSx}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
            Equipos por sede (Top 10)
          </Typography>
          {sedeChart.values.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin datos de sede
            </Typography>
          ) : (
            <Chart
              options={optionsSedes}
              series={[{ name: 'Equipos', data: sedeChart.values }]}
              type="bar"
              height={320}
              width="100%"
            />
          )}
        </Paper>

        <Paper elevation={0} sx={cardSx}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
            Distribución por estado
          </Typography>
          {analytics.estadoSeries.length === 0 || analytics.estadoSeries.every((v) => v === 0) ? (
            <Typography variant="body2" color="text.secondary">
              Sin datos de estado
            </Typography>
          ) : (
            <Chart
              options={optionsEstados}
              series={analytics.estadoSeries}
              type="donut"
              height={320}
              width="100%"
            />
          )}
        </Paper>

        <Paper elevation={0} sx={cardSx}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Origen del parque
          </Typography>
          {origenSorted.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin datos de origen
            </Typography>
          ) : (
            origenSorted.map(([k, v], idx) => (
              <Box key={k} sx={{ mb: 1.75 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {k}
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {v}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analytics.total ? (v / analytics.total) * 100 : 0}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    bgcolor: GFT_PRIMARY_LIGHT,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: ORIGEN_BAR_COLORS[idx % ORIGEN_BAR_COLORS.length],
                      borderRadius: 1,
                    },
                  }}
                />
              </Box>
            ))
          )}
        </Paper>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: bottomAside ? 7 : 12 }}>
          <Paper elevation={0} sx={{ ...cardSx, mb: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              Top marcas en inventario
            </Typography>
            {analytics.topMarcas.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin datos de marca
              </Typography>
            ) : (
              <Chart
                options={optionsMarcas}
                series={[{ name: 'Equipos', data: analytics.topMarcas.map(([, n]) => n) }]}
                type="bar"
                height={300}
                width="100%"
              />
            )}
          </Paper>
        </Grid>
        {bottomAside ? (
          <Grid size={{ xs: 12, lg: 5 }} sx={{ display: 'flex', minHeight: 0 }}>
            <Box sx={{ width: '100%', minWidth: 0 }}>{bottomAside}</Box>
          </Grid>
        ) : null}
      </Grid>
    </>
  )
}
