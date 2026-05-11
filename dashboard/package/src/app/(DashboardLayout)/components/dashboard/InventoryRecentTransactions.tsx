'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { IconRefresh } from '@tabler/icons-react'
import { getDevices } from '@/services/devices'
import { getMovementFeed, type MovementFeedItem } from '@/services/movements'
import { FormattedTraceNotes } from '@/utils/formattedTraceNotes'
import { colorPorTipo, formatFechaTimeline, labelMovimiento } from '@/utils/movementTimeline'

import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard'

type Device = {
  id: number
  placa_equipo?: string | null
  sede?: string | null
  estado?: string | null
  origen?: string | null
  usuario_asignado?: string | null
}

const REFRESH_MS = 30_000

function procesoRealizadoPorDesdeActorFeed(m: MovementFeedItem): string | null {
  const n = (m.actor_display_name || '').trim()
  const e = (m.actor_email || '').trim()
  if (n && e) return `Cambio realizado por: ${n} (${e})`
  if (n) return `Cambio realizado por: ${n}`
  if (e) return `Cambio realizado por: ${e}`
  return null
}

function notesAlreadyIncludeOperatorLeadFeed(m: MovementFeedItem): boolean {
  const n = (m.notes || '').trim().toLowerCase()
  if (!n) return false
  if (n.includes('cambio realizado por:')) return true
  if (n.includes('proceso realizado por:')) return true
  if (n.includes('operador del panel:')) return true
  const first = (m.notes || '').trim().split('\n')[0] ?? ''
  return /^[^,\n]+,\s*(cambio de equipo|asignación tras cambio)\s/i.test(first)
}

function RecentFeedRow({
  m,
  showLineAfter,
}: {
  m: MovementFeedItem
  showLineAfter: boolean
}) {
  const color = colorPorTipo(m.type) as
    | 'error'
    | 'warning'
    | 'primary'
    | 'success'
    | 'secondary'
  const actorPie = procesoRealizadoPorDesdeActorFeed(m)
  const placaLabel = m.placa_equipo || `#${m.device_id}`

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        width: '100%',
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
        <Typography
          component="div"
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, lineHeight: 1.45, wordBreak: 'break-word' }}
        >
          Sede: {m.sede || '—'}
          {m.usuario_asignado ? ` · ${m.usuario_asignado}` : ''}
          {m.estado ? ` · Estado: ${m.estado}` : ''}
        </Typography>
        {m.notes?.trim() ? (
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
            <FormattedTraceNotes text={m.notes} />
          </Typography>
        ) : null}
        {!notesAlreadyIncludeOperatorLeadFeed(m) && actorPie ? (
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
            <FormattedTraceNotes text={actorPie} />
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

function RecentProxyRow({
  d,
  showLineAfter,
}: {
  d: Device
  showLineAfter: boolean
}) {
  const estado = (d.estado || '').toUpperCase()
  const origen = (d.origen || '').toUpperCase()
  const asignado = !!d.usuario_asignado
  let color: 'error' | 'warning' | 'primary' | 'success' | 'secondary' = 'secondary'
  if (estado === 'CAMBIO_PENDIENTE') color = 'warning'
  else if (estado === 'DE_BAJA' || origen === 'BAJA') color = 'error'
  else if (estado === 'ASIGNADO' || asignado) color = 'primary'
  else if (estado === 'EN_BODEGA') color = 'success'

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        width: '100%',
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
          ID {d.id}
          <Box component="span" sx={{ fontWeight: 700, color: 'primary.main', ml: 0.75 }}>
            {d.placa_equipo || `#${d.id}`}
          </Box>
        </Typography>
        <Typography
          component="div"
          fontWeight={600}
          sx={{ mt: 0.5, lineHeight: 1.45, wordBreak: 'break-word' }}
        >
          {estado || 'SIN_ESTADO'} / {origen || 'SIN_ORIGEN'}
        </Typography>
        <Typography
          component="div"
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, lineHeight: 1.45, wordBreak: 'break-word' }}
        >
          Sede: {d.sede || '-'}
          {d.usuario_asignado ? ` · ${d.usuario_asignado}` : ''}
        </Typography>
      </Box>
    </Box>
  )
}

export default function InventoryRecentTransactions() {
  const [feed, setFeed] = useState<MovementFeedItem[]>([])
  const [fallback, setFallback] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [feedError, setFeedError] = useState('')
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const loadFeed = useCallback(async () => {
    try {
      const data = await getMovementFeed(45)
      setFeed(Array.isArray(data) ? data : [])
      setFeedError('')
    } catch {
      setFeed([])
      setFeedError('No se pudo leer el historial de movimientos (¿backend encendido?)')
    }
  }, [])

  const loadFallback = useCallback(async () => {
    try {
      const data = await getDevices()
      setFallback(Array.isArray(data) ? data : [])
    } catch {
      setFallback([])
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadFeed(), loadFallback()])
    setLastSync(new Date())
    setLoading(false)
  }, [loadFeed, loadFallback])

  useEffect(() => {
    refreshAll()
    const id = setInterval(() => {
      loadFeed()
      loadFallback()
      setLastSync(new Date())
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [loadFeed, loadFallback, refreshAll])

  const proxyItems = useMemo(() => {
    return [...fallback].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 8)
  }, [fallback])

  const mostrarFeed = feed.length > 0
  const items = mostrarFeed ? feed : null

  return (
    <DashboardCard
      title="Historial de movimientos"
      subtitle={
        lastSync
          ? `Última sync: ${lastSync.toLocaleTimeString('es-CO')} · auto cada ${REFRESH_MS / 1000}s`
          : 'Cargando…'
      }
      action={
        <Button
          size="small"
          variant="outlined"
          startIcon={<IconRefresh size={16} />}
          onClick={() => refreshAll()}
          disabled={loading}
        >
          Actualizar
        </Button>
      }
    >
      <Box>
        {feedError && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {feedError} Mostrando actividad por equipos recientes.
          </Alert>
        )}
        {!mostrarFeed && !feedError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Aún no hay movimientos en base de datos. Se muestran los últimos equipos dados de alta (por ID).
          </Alert>
        )}

        <Stack
          spacing={1}
          sx={{
            maxHeight: 420,
            overflow: 'auto',
            pr: 0.5,
          }}
        >
          {mostrarFeed &&
            items!.map((m, idx) => (
              <RecentFeedRow key={m.id} m={m} showLineAfter={idx < items!.length - 1} />
            ))}

          {!mostrarFeed &&
            proxyItems.map((d, idx) => (
              <RecentProxyRow key={`d-${d.id}`} d={d} showLineAfter={idx < proxyItems.length - 1} />
            ))}
        </Stack>
      </Box>
    </DashboardCard>
  )
}
