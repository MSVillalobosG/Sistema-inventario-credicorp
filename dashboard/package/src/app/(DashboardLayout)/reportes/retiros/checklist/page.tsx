'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import SearchIcon from '@mui/icons-material/Search'
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer'
import { getInventoryUsers, type InventoryUser } from '@/services/users'

const STORAGE_KEY = 'inventario.retiros.checklist.v1'

const filterUsers = createFilterOptions<InventoryUser>({
  stringify: (u) =>
    `${u.nombre ?? ''} ${u.usuario ?? ''} ${u.documento ?? ''} ${u.email ?? ''} ${u.sede ?? ''} ${u.cargo ?? ''}`,
})

const DEFAULT_ENTREGA_ITEMS: { id: string; label: string }[] = [
  { id: 'maleta', label: 'Maleta / mochila' },
  { id: 'cargador', label: 'Cargador de laptop' },
  { id: 'posapies', label: 'Posapiés' },
  { id: 'mouse', label: 'Mouse' },
  { id: 'teclado', label: 'Teclado' },
  { id: 'monitor', label: 'Monitor (externo)' },
  { id: 'docking', label: 'Base / dock USB-C' },
  { id: 'acceso', label: 'Tarjeta / credencial de acceso' },
  { id: 'celular', label: 'Equipo celular corporativo (si aplica)' },
]

type RetiroChecklistRecord = {
  id: string
  createdAt: string
  nombrePersona: string
  /** Usuario de red del maestro (si se eligió desde el listado). */
  usuarioRed?: string
  documento?: string
  fechaEntrega: string
  observaciones: string
  items: Record<string, boolean>
}

function emptyChecks(): Record<string, boolean> {
  return Object.fromEntries(DEFAULT_ENTREGA_ITEMS.map((i) => [i.id, false]))
}

function loadRecords(): RetiroChecklistRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RetiroChecklistRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRecords(list: RetiroChecklistRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function todayInputValue() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function recordHaystackForSearch(r: RetiroChecklistRecord): string {
  const resumen = DEFAULT_ENTREGA_ITEMS.filter((i) => r.items[i.id])
    .map((i) => i.label)
    .join(' ')
  return [
    r.nombrePersona,
    r.usuarioRed,
    r.documento,
    r.fechaEntrega,
    r.observaciones,
    resumen,
  ]
    .map((x) => String(x ?? '').toLowerCase())
    .join(' ')
}

function matchesHistorySearch(r: RetiroChecklistRecord, raw: string): boolean {
  const q = raw.trim().toLowerCase()
  if (!q) return true
  const tokens = q.split(/\s+/).filter(Boolean)
  const hay = recordHaystackForSearch(r)
  return tokens.every((t) => hay.includes(t))
}

function personFingerprint(r: RetiroChecklistRecord): string {
  return `${String(r.nombrePersona || '').trim().toLowerCase()}|${String(r.usuarioRed || '').trim().toLowerCase()}|${String(r.documento || '').trim().toLowerCase()}`
}

type HistorySearchSummary = {
  nRecords: number
  /** Ítems entregados al menos una vez y en cuántos registros aparece cada uno */
  itemCounts: { id: string; label: string; count: number }[]
  singlePerson: boolean
  displayName: string
  usuarioRed?: string
  documento?: string
  fechas: string[]
}

function buildHistorySearchSummary(rows: RetiroChecklistRecord[]): HistorySearchSummary | null {
  if (rows.length === 0) return null
  const counts: Record<string, number> = {}
  for (const r of rows) {
    for (const def of DEFAULT_ENTREGA_ITEMS) {
      if (r.items[def.id]) counts[def.id] = (counts[def.id] ?? 0) + 1
    }
  }
  const itemCounts = DEFAULT_ENTREGA_ITEMS.map((def) => ({
    id: def.id,
    label: def.label,
    count: counts[def.id] ?? 0,
  })).filter((x) => x.count > 0)

  const fingerprints = new Set(rows.map(personFingerprint))
  const singlePerson = fingerprints.size === 1
  const first = rows[0]
  const fechas = [...new Set(rows.map((r) => r.fechaEntrega).filter(Boolean))].sort()

  return {
    nRecords: rows.length,
    itemCounts,
    singlePerson,
    displayName: String(first.nombrePersona || '').trim() || '—',
    usuarioRed: first.usuarioRed,
    documento: first.documento,
    fechas,
  }
}

export default function RetirosChecklistPage() {
  const [users, setUsers] = useState<InventoryUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<InventoryUser | null>(null)
  const [fechaEntrega, setFechaEntrega] = useState(todayInputValue)
  const [observaciones, setObservaciones] = useState('')
  const [checks, setChecks] = useState<Record<string, boolean>>(emptyChecks)
  const [records, setRecords] = useState<RetiroChecklistRecord[]>([])
  const [historySearch, setHistorySearch] = useState('')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    setRecords(loadRecords())
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setUsersLoading(true)
      setUsersError(null)
      try {
        const data = await getInventoryUsers()
        const list = Array.isArray(data) ? [...data] : []
        list.sort((a, b) =>
          String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }),
        )
        if (!cancelled) setUsers(list)
      } catch {
        if (!cancelled) {
          setUsers([])
          setUsersError('No se pudo cargar el maestro de usuarios. Revise la sesión o intente de nuevo.')
        }
      } finally {
        if (!cancelled) setUsersLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const resumenItems = useCallback((r: RetiroChecklistRecord) => {
    const entregados = DEFAULT_ENTREGA_ITEMS.filter((i) => r.items[i.id]).map((i) => i.label)
    return entregados.length ? entregados.join(', ') : 'Ninguno marcado'
  }, [])

  const nombrePersona = selectedUser ? String(selectedUser.nombre || '').trim() : ''
  const puedeGuardar = selectedUser != null && nombrePersona.length > 0

  const handleGuardar = () => {
    if (!puedeGuardar || !selectedUser) return
    const next: RetiroChecklistRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
      nombrePersona,
      usuarioRed: String(selectedUser.usuario || '').trim() || undefined,
      documento: String(selectedUser.documento || '').trim() || undefined,
      fechaEntrega,
      observaciones: observaciones.trim(),
      items: { ...checks },
    }
    const list = [next, ...records]
    setRecords(list)
    saveRecords(list)
    setChecks(emptyChecks())
    setSelectedUser(null)
    setObservaciones('')
    setFechaEntrega(todayInputValue())
    setSaveMsg('Registro guardado en este navegador.')
    window.setTimeout(() => setSaveMsg(null), 4000)
  }

  const eliminar = (id: string) => {
    const list = records.filter((r) => r.id !== id)
    setRecords(list)
    saveRecords(list)
  }

  const filteredHistory = useMemo(
    () => records.filter((r) => matchesHistorySearch(r, historySearch)),
    [records, historySearch],
  )

  const historySummary = useMemo(() => buildHistorySearchSummary(filteredHistory), [filteredHistory])

  const showHistorySummaryPanel = Boolean(historySearch.trim() && historySummary && historySummary.nRecords > 0)

  return (
    <PageContainer
      title="Checklist de entrega (Retiros)"
      description="Elija la persona desde el maestro de usuarios (búsqueda por nombre, documento o usuario de red), marque lo entregado y guarde. El historial queda solo en este navegador."
    >
      <Stack spacing={3}>
        {saveMsg && <Alert severity="success">{saveMsg}</Alert>}

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Nuevo registro
          </Typography>
          <Stack spacing={2}>
            {usersError && (
              <Alert severity="warning" onClose={() => setUsersError(null)}>
                {usersError}
              </Alert>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
              <Autocomplete
                fullWidth
                options={users}
                loading={usersLoading}
                value={selectedUser}
                onChange={(_, v) => setSelectedUser(v)}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                getOptionLabel={(u) => String(u.nombre || '').trim() || u.usuario || `id ${u.id}`}
                filterOptions={(opts, state) => filterUsers(opts, state)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Persona (maestro de usuarios)"
                    required
                    placeholder="Busque por nombre, documento o usuario de red…"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {usersLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, u) => (
                  <li {...props}>
                    <Box sx={{ py: 0.25 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {u.nombre || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Usuario: {u.usuario || '—'} · Doc.: {u.documento || '—'}
                        {u.sede ? ` · ${u.sede}` : ''}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
              <TextField
                label="Fecha de entrega"
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ minWidth: { sm: 200 } }}
              />
            </Stack>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Elementos entregados
              </Typography>
              <FormGroup sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 0.5 }}>
                {DEFAULT_ENTREGA_ITEMS.map((item) => (
                  <FormControlLabel
                    key={item.id}
                    control={
                      <Checkbox
                        checked={Boolean(checks[item.id])}
                        onChange={(_, v) => setChecks((c) => ({ ...c, [item.id]: v }))}
                      />
                    }
                    label={item.label}
                  />
                ))}
              </FormGroup>
            </Box>
            <TextField
              label="Observaciones"
              fullWidth
              multiline
              minRows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Otros accesorios, estado del equipo, incidencias…"
            />
            <Box>
              <Button
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                onClick={handleGuardar}
                disabled={!puedeGuardar}
                sx={{ textTransform: 'none' }}
              >
                Guardar registro
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
            Historial guardado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {records.length === 0
              ? 'Aún no hay registros. Al guardar, aparecerán aquí (solo en este equipo / navegador).'
              : historySearch.trim()
                ? `Mostrando ${filteredHistory.length} de ${records.length} registro(s).`
                : `${records.length} registro(s). Use el buscador para filtrar por persona o por lo entregado.`}
          </Typography>

          {records.length > 0 && (
            <TextField
              size="small"
              fullWidth
              sx={{ mb: 2, maxWidth: { sm: 480 } }}
              placeholder="Buscar en historial: nombre, usuario, documento, fecha o artículo entregado…"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              aria-label="Buscar en el historial de retiros"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}

          {showHistorySummaryPanel && historySummary && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 2,
                borderColor: 'primary.main',
                bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.12)' : 'rgba(25, 118, 210, 0.06)',
              }}
            >
              <Typography variant="subtitle1" fontWeight={800} color="primary" sx={{ mb: 1 }}>
                Resumen de lo entregado (búsqueda actual)
              </Typography>
              {historySummary.singlePerson ? (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body1" fontWeight={700}>
                    {historySummary.displayName}
                  </Typography>
                  {(historySummary.usuarioRed || historySummary.documento) && (
                    <Typography variant="body2" color="text.secondary">
                      Usuario: {historySummary.usuarioRed ?? '—'} · Doc.: {historySummary.documento ?? '—'}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Hay <strong>{historySummary.nRecords}</strong> retiro(s) que coinciden; pertenecen a más de una persona.
                  Acumulado de artículos en todos ellos:
                </Typography>
              )}

              <Typography variant="body2" sx={{ mb: 1 }}>
                {historySummary.singlePerson ? (
                  <>
                    En <strong>{historySummary.nRecords}</strong> registro(s) de retiro
                    {historySummary.fechas.length > 0 && (
                      <>
                        {' '}
                        (fechas: {historySummary.fechas.join(', ')})
                      </>
                    )}
                    , consta que entregó:
                  </>
                ) : (
                  <>
                    En <strong>{historySummary.nRecords}</strong> registro(s) (fechas: {historySummary.fechas.join(', ')})
                    , consta entrega de:
                  </>
                )}
              </Typography>

              {historySummary.itemCounts.length > 0 ? (
                <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                  {historySummary.itemCounts.map((row) => (
                    <Chip
                      key={row.id}
                      color="primary"
                      variant="filled"
                      sx={{ fontWeight: 600 }}
                      label={
                        row.count === historySummary.nRecords
                          ? `${row.label} (en todos los registros)`
                          : `${row.label} (${row.count} de ${historySummary.nRecords} retiro${historySummary.nRecords === 1 ? '' : 's'})`
                      }
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  En estos registros no hay artículos marcados como entregados.
                </Typography>
              )}
            </Paper>
          )}

          {records.length > 0 && filteredHistory.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No hay registros que coincidan con «{historySearch.trim()}». Pruebe otra palabra o borre el buscador.
            </Alert>
          )}

          {records.length > 0 && filteredHistory.length > 0 && (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha entrega</TableCell>
                    <TableCell>Persona</TableCell>
                    <TableCell>Entregó</TableCell>
                    <TableCell>Observaciones</TableCell>
                    <TableCell align="right" width={56}>
                      Borrar
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHistory.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.fechaEntrega}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {r.nombrePersona}
                        </Typography>
                        {(r.usuarioRed || r.documento) && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {[
                              r.usuarioRed ? `Usuario: ${r.usuarioRed}` : null,
                              r.documento ? `Doc.: ${r.documento}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 360, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {resumenItems(r)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {r.observaciones || '—'}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Eliminar registro">
                          <IconButton size="small" color="error" onClick={() => eliminar(r.id)} aria-label="Eliminar">
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        <Divider />
        <Typography variant="caption" color="text.secondary">
          Nota: no hay envío al servidor; para respaldo exporte o copie los datos si lo necesita. Si limpia el almacenamiento
          del sitio, se pierde el historial.
        </Typography>
      </Stack>
    </PageContainer>
  )
}
