'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import {
  IconActivity,
  IconCpu,
  IconHistory,
  IconRefresh,
  IconSearch,
  IconUsers,
} from '@tabler/icons-react'
import { getDeviceByPlaca } from '@/services/devices'
import { getMovementsByPlaca, type DeviceMovementRow } from '@/services/movements'
import { FormattedTraceNotes } from '@/utils/formattedTraceNotes'
import { colorPorTipo, formatFechaTimeline, labelMovimiento } from '@/utils/movementTimeline'
import InventoryInfoRow from '@/app/(DashboardLayout)/components/shared/InventoryInfoRow'
import InventorySectionCard from '@/app/(DashboardLayout)/components/shared/InventorySectionCard'

type Device = Record<string, any>

function etiquetaEstadoTraza(estado: string): string {
  const u = (estado || '').toUpperCase()
  const map: Record<string, string> = {
    ASIGNADO: 'Asignado',
    EN_BODEGA: 'En bodega',
    EN_REPARACION: 'En reparación',
    DE_BAJA: 'De baja',
    CAMBIO_PENDIENTE: 'Cambio pendiente',
  }
  return map[u] || (estado ? String(estado).replace(/_/g, ' ') : '—')
}

function etiquetaOrigenTraza(origen: string): string {
  const u = (origen || '').toUpperCase()
  const map: Record<string, string> = {
    NUEVO: 'Nuevo',
    DEVOLUCION: 'Devolución',
    REPARACION: 'Reparación',
    BAJA: 'Baja',
  }
  return map[u] || origen || '—'
}

function chipColorEstado(estado: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  const u = (estado || '').toUpperCase()
  if (u === 'ASIGNADO') return 'success'
  if (u === 'EN_BODEGA') return 'info'
  if (u === 'EN_REPARACION') return 'warning'
  if (u === 'DE_BAJA') return 'error'
  if (u === 'CAMBIO_PENDIENTE') return 'warning'
  return 'default'
}

function chipColorOrigen(origen: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  const u = (origen || '').toUpperCase()
  if (u === 'NUEVO') return 'info'
  if (u === 'DEVOLUCION') return 'warning'
  if (u === 'REPARACION') return 'warning'
  if (u === 'BAJA') return 'error'
  return 'default'
}

function paletteAccent(
  theme: Theme,
  key: 'default' | 'success' | 'warning' | 'error' | 'info',
  fallback: string,
): string {
  if (key === 'default') return fallback
  const p = theme.palette[key]
  return p?.main ?? fallback
}

/** Fecha del agente (ISO / naive) en texto legible para Colombia. */
function formatFechaReporte(val: string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '—'
  const s = String(val).trim()
  try {
    let t = s.includes('T') ? s : s.replace(' ', 'T')
    const hasTz = /[zZ]$/.test(t) || /[+-]\d{2}:?\d{2}$/.test(t)
    if (!hasTz) t = `${t}Z`
    const d = new Date(t)
    if (Number.isNaN(d.getTime())) return s
    return d.toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return s
  }
}

/** Nombre del maestro de usuarios + usuario de red, si viene del API. */
function textoAsignadoA(device: Device): string {
  const login = (device.usuario_asignado || '').trim()
  const nombre = (device.nombre_usuario_asignado || '').trim()
  if (!login) return ''
  if (nombre) return `${nombre} · ${login}`
  return login
}

/** Usuario que figuraba antes (p. ej. tras devolución): nombre completo · login. */
function textoUsuarioAnteriorPorDevolucion(device: Device): string {
  const login = (device.usuario_responsable || '').trim()
  const nombre = (device.nombre_usuario_responsable || '').trim()
  if (!login) return ''
  if (nombre) return `${nombre} · ${login}`
  return login
}

/** Si la nota no trae pie estándar pero el movimiento sí tiene actor en BD, mostrar misma línea que en traza nueva. */
function procesoRealizadoPorDesdeActor(m: DeviceMovementRow): string | null {
  const n = (m.actor_display_name || '').trim()
  const e = (m.actor_email || '').trim()
  if (n && e) return `Cambio realizado por: ${n} (${e})`
  if (n) return `Cambio realizado por: ${n}`
  if (e) return `Cambio realizado por: ${e}`
  return null
}

/** La nota ya identifica al operador (pie estándar o formatos antiguos): no repetir actor abajo. */
function notesAlreadyIncludeOperatorLead(m: DeviceMovementRow): boolean {
  const n = (m.notes || '').trim().toLowerCase()
  if (!n) return false
  if (n.includes('cambio realizado por:')) return true
  if (n.includes('proceso realizado por:')) return true
  if (n.includes('operador del panel:')) return true
  const first = (m.notes || '').trim().split('\n')[0] ?? ''
  return /^[^,\n]+,\s*(cambio de equipo|asignación tras cambio)\s/i.test(first)
}

function HistorialMovimientoRow({
  m,
  placaLabel,
  showLineAfter,
}: {
  m: DeviceMovementRow
  placaLabel: string
  showLineAfter: boolean
}) {
  const color = colorPorTipo(m.type) as
    | 'error'
    | 'warning'
    | 'primary'
    | 'success'
    | 'secondary'
  const actorPie = procesoRealizadoPorDesdeActor(m)
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        width: '100%',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: 16,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: '4px',
        }}
      >
        <Box
          sx={(theme) => ({
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: `2px solid ${theme.palette[color].main}`,
            bgcolor: 'background.paper',
            flexShrink: 0,
          })}
        />
        {showLineAfter ? (
          <Box
            sx={{
              width: 2,
              flexShrink: 0,
              minHeight: 28,
              flexGrow: 0,
              bgcolor: '#e0e0e0',
              borderRadius: 1,
              mt: 0.5,
              mb: 0,
            }}
          />
        ) : null}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, pb: 2, overflow: 'visible' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          sx={{ lineHeight: 1.5, wordBreak: 'break-word' }}
        >
          {formatFechaTimeline(m.created_at)}
          <Box component="span" sx={{ fontWeight: 700, color: 'primary.main', ml: 0.75 }}>
            {placaLabel}
          </Box>
        </Typography>
        <Typography
          component="div"
          fontWeight={600}
          sx={{ mt: 0.5, lineHeight: 1.45, wordBreak: 'break-word' }}
        >
          {labelMovimiento(m.type)}
        </Typography>
        {m.notes?.trim() ? (
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
            <FormattedTraceNotes text={m.notes} />
          </Typography>
        ) : null}
        {!notesAlreadyIncludeOperatorLead(m) && actorPie ? (
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
            <FormattedTraceNotes text={actorPie} />
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

export default function ConsultaEquiposPage() {
  const theme = useTheme()
  const [placa, setPlaca] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [device, setDevice] = useState<Device | null>(null)
  const [movements, setMovements] = useState<DeviceMovementRow[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const [movementsError, setMovementsError] = useState<string | null>(null)

  const loadHistorial = useCallback(async (placaKey: string) => {
    setMovementsLoading(true)
    setMovementsError(null)
    try {
      const rows = await getMovementsByPlaca(placaKey)
      setMovements(rows)
    } catch (e: unknown) {
      setMovements([])
      const hint = e instanceof Error && e.message ? ` (${e.message})` : ''
      setMovementsError(`No se pudo cargar el historial de trazas.${hint}`)
    } finally {
      setMovementsLoading(false)
    }
  }, [])

  useEffect(() => {
    const placaKey = (device?.placa_equipo || '').trim()
    if (!placaKey) {
      setMovements([])
      setMovementsError(null)
      return
    }
    loadHistorial(placaKey)
  }, [device?.placa_equipo, loadHistorial])

  const movementsRecientesPrimero = useMemo(
    () => [...movements].reverse(),
    [movements]
  )

  const handleSearch = async () => {
    const p = placa.trim().toUpperCase()
    if (!p) {
      setError('Ingrese una placa para buscar')
      return
    }

    setLoading(true)
    setError(null)
    setDevice(null)

    try {
      const data = await getDeviceByPlaca(p)
      setDevice(data)
    } catch (e: any) {
      setError(e?.message || 'No se pudo consultar el equipo')
    } finally {
      setLoading(false)
    }
  }

  const trace = useMemo(() => {
    if (!device) return []
    const items: { title: string; detail?: string }[] = []

    const estado = (device.estado || '').toUpperCase()
    const origen = (device.origen || '').toUpperCase()

    items.push({
      title: 'Estado actual',
      detail: etiquetaEstadoTraza(device.estado || ''),
    })
    items.push({
      title: 'Origen',
      detail: etiquetaOrigenTraza(device.origen || ''),
    })

    if (device.usuario_asignado) {
      items.push({
        title: 'Asignado a',
        detail: textoAsignadoA(device),
      })
    } else {
      items.push({
        title: 'Sin asignación',
        detail: 'Equipo actualmente sin usuario asignado',
      })
    }

    if (device.usuario_responsable) {
      items.push({
        title: 'Usuario anterior por devolución',
        detail: textoUsuarioAnteriorPorDevolucion(device),
      })
    }

    if (device.fecha_ultimo_reporte || device.ip_ultimo_reporte) {
      const f = formatFechaReporte(device.fecha_ultimo_reporte)
      const ip = device.ip_ultimo_reporte || '—'
      items.push({
        title: 'Último reporte',
        detail: `${f} · IP: ${ip}`,
      })
    }

    if (estado === 'DE_BAJA' || origen === 'BAJA') {
      items.push({
        title: 'Equipo dado de baja',
        detail: 'El equipo no debe reasignarse.',
      })
    }

    return items
  }, [device])

  const gradA = theme.palette.primary.dark
  const gradB = theme.palette.primary.main
  const gradC = alpha(theme.palette.primary.light, 0.85)

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        px: { xs: 1.5, sm: 2, md: 2.5, lg: 3 },
        py: { xs: 2, md: 3 },
        pb: 5,
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: -0.5,
            background: `linear-gradient(135deg, ${gradA} 0%, ${gradB} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Consulta de equipos
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75, maxWidth: 560 }}>
          Busca por placa y obtén ficha del equipo, usuarios y trazabilidad en un solo vistazo.
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: (t) =>
            `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.04)} 0%, ${t.palette.background.paper} 100%)`,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            label="Placa del equipo"
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            placeholder="Ej: ML-300105"
            size="medium"
            fullWidth
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={20} stroke={1.5} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: { sm: 1 },
              minWidth: 0,
              maxWidth: { xs: '100%', sm: 'none' },
              '& .MuiOutlinedInput-root': { borderRadius: 2 },
            }}
          />
          <Button
            variant="contained"
            size="large"
            onClick={handleSearch}
            disabled={loading}
            sx={{
              px: 3,
              py: 1.25,
              borderRadius: 2,
              fontWeight: 700,
              boxShadow: (t) => `0 8px 24px ${alpha(t.palette.primary.main, 0.35)}`,
            }}
          >
            {loading ? 'Buscando…' : 'Consultar'}
          </Button>
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}
      </Paper>

      {!device ? null : (
        <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
          <Grid size={{ xs: 12, md: 8, lg: 9 }} sx={{ display: 'flex' }}>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: (t) => `0 12px 40px ${alpha(t.palette.common.black, 0.06)}`,
              }}
            >
              <Box
                sx={{
                  px: { xs: 2, sm: 3 },
                  py: { xs: 2.5, sm: 3 },
                  background: `linear-gradient(125deg, ${gradA} 0%, ${gradB} 52%, ${gradC} 100%)`,
                  color: 'primary.contrastText',
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.2 }}>
                      Placa
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 0.5, lineHeight: 1.15 }}>
                      {device.placa_equipo}
                    </Typography>
                    <Typography sx={{ mt: 0.75, opacity: 0.9, fontSize: '0.95rem' }}>
                      Serial:{' '}
                      <Box component="span" fontWeight={600}>
                        {device.serial_number || '—'}
                      </Box>
                    </Typography>
                  </Box>
                  <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                    <Chip
                      label={etiquetaEstadoTraza(device.estado || '')}
                      size="medium"
                      sx={(t) => {
                        const c = paletteAccent(
                          t,
                          chipColorEstado(device.estado || ''),
                          t.palette.grey[600],
                        )
                        return {
                          fontWeight: 800,
                          bgcolor: alpha('#fff', 0.97),
                          color: 'text.primary',
                          border: 'none',
                          boxShadow: `inset 0 0 0 2px ${alpha(c, 0.45)}`,
                        }
                      }}
                    />
                    <Chip
                      label={etiquetaOrigenTraza(device.origen || '')}
                      size="medium"
                      sx={(t) => {
                        const c = paletteAccent(
                          t,
                          chipColorOrigen(device.origen || ''),
                          t.palette.info.main,
                        )
                        return {
                          fontWeight: 800,
                          bgcolor: alpha('#fff', 0.97),
                          color: 'text.primary',
                          border: 'none',
                          boxShadow: `inset 0 0 0 2px ${alpha(c, 0.45)}`,
                        }
                      }}
                    />
                  </Stack>
                </Stack>
              </Box>

              <Stack spacing={2.5} sx={{ p: { xs: 2, sm: 2.5 } }}>
                <InventorySectionCard title="Información general" icon={<IconCpu stroke={1.5} />}>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <InventoryInfoRow label="Sede" value={device.sede} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <InventoryInfoRow label="Ciudad" value={device.ciudad} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <InventoryInfoRow label="Tipo contrato" value={device.tipo_contrato} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <InventoryInfoRow label="Tipo equipo" value={device.tipo_equipo} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <InventoryInfoRow label="Marca" value={device.marca} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <InventoryInfoRow label="Modelo" value={device.modelo} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <InventoryInfoRow label="Sistema operativo" value={device.sistema_operativo} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <InventoryInfoRow label="Procesador" value={device.tipo_procesador} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <InventoryInfoRow label="RAM" value={device.capacidad_ram} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <InventoryInfoRow label="Disco" value={device.capacidad_disco} />
                    </Grid>
                  </Grid>
                </InventorySectionCard>

                <InventorySectionCard title="Usuarios" icon={<IconUsers stroke={1.5} />}>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InventoryInfoRow
                        label="Usuario asignado (actual)"
                        value={device.usuario_asignado ? textoAsignadoA(device) : '—'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InventoryInfoRow
                        label="Usuario anterior por devolución"
                        value={
                          device.usuario_responsable
                            ? textoUsuarioAnteriorPorDevolucion(device)
                            : '—'
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InventoryInfoRow label="Documento" value={device.documento} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InventoryInfoRow label="Correo usuario" value={device.correo_usuario} />
                    </Grid>
                  </Grid>
                </InventorySectionCard>

                <InventorySectionCard title="Último reporte (agente)" icon={<IconActivity stroke={1.5} />}>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InventoryInfoRow label="Fecha último reporte" value={formatFechaReporte(device.fecha_ultimo_reporte)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InventoryInfoRow label="IP último reporte" value={device.ip_ultimo_reporte} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InventoryInfoRow label="IP consola" value={device.ip_consola} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InventoryInfoRow label="MAC" value={device.mac} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InventoryInfoRow label="Dominio" value={device.dominio} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InventoryInfoRow label="Arquitectura" value={device.arquitectura} />
                    </Grid>
                  </Grid>
                </InventorySectionCard>
              </Stack>
            </Paper>
          </Grid>

          <Grid
            size={{ xs: 12, md: 4, lg: 3 }}
            sx={{ display: 'flex', minHeight: { xs: 360, md: 0 }, alignSelf: 'stretch' }}
          >
            <Paper
              elevation={0}
              sx={{
                flex: '1 1 0',
                width: '100%',
                minWidth: 0,
                minHeight: 0,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: (t) => `0 12px 40px ${alpha(t.palette.common.black, 0.05)}`,
              }}
            >
              <Box
                sx={{
                  flexShrink: 0,
                  px: { xs: 2, sm: 2.5 },
                  pt: { xs: 2, sm: 2.5 },
                  pb: 1.5,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ color: 'primary.main', display: 'flex' }}>
                    <IconHistory size={22} stroke={1.5} />
                  </Box>
                  <Typography variant="h6" fontWeight={800}>
                    Traza
                  </Typography>
                  <Chip
                    label="En vivo"
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ ml: 'auto !important' }}
                  />
                </Stack>
              </Box>

              <Box
                sx={{
                  flex: '1 1 0',
                  minWidth: 0,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  px: { xs: 2, sm: 2.5 },
                  pb: { xs: 2, sm: 2.5 },
                }}
              >
                {/* Resumen completo visible, sin barra de desplazamiento */}
                <Box sx={{ flexShrink: 0, overflow: 'visible' }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>
                    Resumen actual
                  </Typography>
                  {trace.length === 0 ? (
                    <Typography color="text.secondary" sx={{ my: 2 }}>
                      Sin información de traza.
                    </Typography>
                  ) : (
                    <Stack spacing={1.25} sx={{ mt: 1, mb: 0.5 }}>
                      {trace.map((t, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            pl: 1.75,
                            py: 1.25,
                            borderLeft: '3px solid',
                            borderColor: 'primary.main',
                            borderRadius: '0 10px 10px 0',
                            bgcolor: (th) => alpha(th.palette.primary.main, 0.05),
                          }}
                        >
                          <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                            {t.title}
                          </Typography>
                          {t.detail ? (
                            <Typography variant="body2" sx={{ mt: 0.35, fontWeight: 600, lineHeight: 1.45 }}>
                              {t.detail}
                            </Typography>
                          ) : null}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>

                <Divider sx={{ flexShrink: 0, my: 1.25 }} />

                {/* flex-basis 0 + minHeight 0: el contenedor sí se acota y aparece overflow/scrollbar */}
                <Box
                  sx={{
                    flex: '1 1 0',
                    minWidth: 0,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    pr: 0.5,
                    scrollbarGutter: 'stable',
                    WebkitOverflowScrolling: 'touch',
                    // Respaldo si la fila del Grid no acota el alto (evita lista infinita sin barra)
                    maxHeight: { md: 'calc(100dvh - 200px)' },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={800}>
                      Historial de movimientos
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<IconRefresh size={16} />}
                      disabled={movementsLoading || !(device?.placa_equipo || '').trim()}
                      onClick={() => {
                        const p = (device?.placa_equipo || '').trim()
                        if (p) loadHistorial(p)
                      }}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      Actualizar
                    </Button>
                  </Box>

                  {movementsError ? (
                    <Alert severity="warning" sx={{ mt: 1, mb: 1, borderRadius: 2 }}>
                      {movementsError}
                    </Alert>
                  ) : null}
                  {movementsLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" color="text.secondary">
                        Cargando movimientos…
                      </Typography>
                    </Box>
                  ) : movements.length === 0 && !movementsError ? (
                    <Typography sx={{ color: 'text.secondary', mt: 1, fontSize: '0.8rem' }}>
                      Sin movimientos registrados para esta placa.
                    </Typography>
                  ) : null}

                  {movementsRecientesPrimero.length > 0 ? (
                    <Stack spacing={1} sx={{ mt: 1, width: '100%' }}>
                      {movementsRecientesPrimero.map((m, idx) => (
                        <HistorialMovimientoRow
                          key={m.id}
                          m={m}
                          placaLabel={(device?.placa_equipo || '').trim() || '—'}
                          showLineAfter={idx < movementsRecientesPrimero.length - 1}
                        />
                      ))}
                    </Stack>
                  ) : null}
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}

