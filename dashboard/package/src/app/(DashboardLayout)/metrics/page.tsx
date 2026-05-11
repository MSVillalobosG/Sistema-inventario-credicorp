'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from '@mui/material/styles'
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer'
import { getDevices } from '@/services/devices'
import {
  buildSedeChartTop10,
  computeDeviceAnalytics,
  type Device,
} from '@/utils/deviceAnalytics'
import { GFT_PRIMARY } from '@/utils/theme/DefaultColors'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

function KpiCard({
  title,
  value,
  hint,
  progress,
}: {
  title: string
  value: string | number
  hint?: string
  progress?: number
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5, color: 'primary.main' }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" display="block">
          {hint}
        </Typography>
      )}
      {progress !== undefined && progress >= 0 && (
        <LinearProgress
          variant="determinate"
          value={Math.min(100, progress)}
          sx={{ mt: 1.5, height: 6, borderRadius: 1 }}
        />
      )}
    </Paper>
  )
}

export default function MetricsPage() {
  const theme = useTheme()
  const primary = theme.palette.primary.main
  const secondary = theme.palette.secondary.main
  const primaryLight = theme.palette.primary.light

  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDevices()
        setDevices(Array.isArray(data) ? data : [])
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

  const optionsSedes: any = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: theme.typography.fontFamily },
    colors: [primary],
    plotOptions: {
      bar: { horizontal: true, barHeight: '72%', borderRadius: 4 },
    },
    dataLabels: { enabled: true, style: { colors: ['#fff'] } },
    xaxis: { categories: sedeChart.categories },
    grid: { borderColor: theme.palette.divider, strokeDashArray: 4 },
    tooltip: { theme: 'light' },
  }

  const estadoDonutColors = [
    primary,
    secondary,
    primaryLight,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.grey[400],
  ].slice(0, Math.max(analytics.estadoLabels.length, 1))

  const optionsEstados: any = {
    chart: { type: 'donut', fontFamily: theme.typography.fontFamily },
    labels: analytics.estadoLabels,
    colors: estadoDonutColors,
    legend: { position: 'bottom' },
    plotOptions: {
      pie: {
        donut: { size: '65%' },
      },
    },
    dataLabels: { enabled: true },
    tooltip: { theme: 'light' },
  }

  const optionsMarcas: any = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: theme.typography.fontFamily },
    colors: [secondary],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: analytics.topMarcas.map(([m]) => (m.length > 18 ? `${m.slice(0, 16)}…` : m)),
      labels: { rotate: -25 },
    },
    grid: { borderColor: theme.palette.divider, strokeDashArray: 4 },
    tooltip: { theme: 'light' },
  }

  const columns: GridColDef[] = [
    { field: 'sede', headerName: 'Sede', minWidth: 140, flex: 1 },
    { field: 'total', headerName: 'Total', width: 90, type: 'number' },
    { field: 'asignados', headerName: 'Asignados', width: 110, type: 'number' },
    { field: 'enBodega', headerName: 'En bodega', width: 110, type: 'number' },
    {
      field: 'pctAsignacion',
      headerName: '% Asign. en sede',
      width: 140,
      type: 'number',
      valueFormatter: (value: number | null) => (value == null ? '' : `${value}%`),
    },
  ]

  return (
    <PageContainer title="Métricas" description="Indicadores operativos del inventario">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 700 }}>
          Métricas de inventario
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Vista consolidada para priorizar bodega, asignaciones y calidad de datos.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {(analytics.sinSede > 0 || analytics.cambioPendiente > 0) && (
              <StackAlerts sinSede={analytics.sinSede} cambio={analytics.cambioPendiente} />
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(5, 1fr)',
                },
                gap: 2,
                mb: 2,
              }}
            >
              <KpiCard title="Total equipos" value={analytics.total} />
              <KpiCard
                title="Tasa de asignación"
                value={`${analytics.tasaAsignacionGlobal}%`}
                hint={`${analytics.asignados} equipos con usuario`}
                progress={analytics.tasaAsignacionGlobal}
              />
              <KpiCard
                title="Stock en bodega"
                value={analytics.enBodegaLibre}
                hint={`${analytics.stockDisponiblePct}% del parque sin asignar y en EN_BODEGA`}
                progress={analytics.stockDisponiblePct}
              />
              <KpiCard
                title="Usuarios con equipo"
                value={analytics.usuariosConEquipo}
                hint="Colaboradores únicos con al menos un activo"
              />
              <KpiCard
                title="Cambio / Baja / Reparación"
                value={analytics.cambioPendiente + analytics.baja + analytics.enReparacion}
                hint={`Cambio: ${analytics.cambioPendiente} · Baja: ${analytics.baja} · Rep.: ${analytics.enReparacion}`}
              />
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <KpiCard title="Cambio pendiente" value={analytics.cambioPendiente} hint="Requieren seguimiento de mesa" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KpiCard title="En reparación" value={analytics.enReparacion} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KpiCard
                  title="Calidad: sin sede"
                  value={analytics.sinSede}
                  hint="Registros a completar en sede"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KpiCard
                  title="Calidad: sin marca"
                  value={analytics.sinMarca}
                  hint="Normalizar ficha técnica"
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} lg={5}>
                <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Equipos por sede (Top 10)
                  </Typography>
                  <Chart
                    options={optionsSedes}
                    series={[{ name: 'Equipos', data: sedeChart.values }]}
                    type="bar"
                    height={320}
                    width="100%"
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} lg={4}>
                <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Distribución por estado
                  </Typography>
                  <Chart
                    options={optionsEstados}
                    series={analytics.estadoSeries}
                    type="donut"
                    height={320}
                    width="100%"
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} lg={3}>
                <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    Origen del parque
                  </Typography>
                  {Object.entries(analytics.porOrigen)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <Box key={k} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{k}</Typography>
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
                            bgcolor: primaryLight,
                            '& .MuiLinearProgress-bar': { bgcolor: GFT_PRIMARY },
                          }}
                        />
                      </Box>
                    ))}
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Top marcas en inventario
                  </Typography>
                  <Chart
                    options={optionsMarcas}
                    series={[{ name: 'Equipos', data: analytics.topMarcas.map(([, n]) => n) }]}
                    type="bar"
                    height={280}
                    width="100%"
                  />
                </Paper>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Detalle por sede
            </Typography>
            <Paper
              sx={{
                width: '100%',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <DataGrid
                rows={analytics.sedeRows}
                columns={columns}
                disableRowSelectionOnClick
                density="compact"
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
                autoHeight
                sx={{ minHeight: 200, border: 'none' }}
              />
            </Paper>
          </>
        )}
      </Box>
    </PageContainer>
  )
}

function StackAlerts({ sinSede, cambio }: { sinSede: number; cambio: number }) {
  return (
    <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {sinSede > 0 && (
        <Alert severity="warning">
          Hay <strong>{sinSede}</strong> equipos sin sede definida: conviene completar el dato para reportes y filtros.
        </Alert>
      )}
      {cambio > 0 && (
        <Alert severity="info">
          <strong>{cambio}</strong> equipos en <strong>CAMBIO_PENDIENTE</strong>: revisar flujo con mesa de ayuda / bodega.
        </Alert>
      )}
    </Box>
  )
}
