'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import UndoIcon from '@mui/icons-material/Undo'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { DataGrid, GridColDef, GridRow, type GridRowProps } from '@mui/x-data-grid'
import Link from 'next/link'
import {
  getDevices,
  adminPatchDevice,
  adminAssignUserToDevice,
  adminDeleteDevice,
  returnDeviceByPlaca,
  type ReturnDeviceAccion,
} from '@/services/devices'
import { DEVICE_EDIT_FIELD_KEYS } from '@/lib/deviceEditFields'
import { isSuperAdmin } from '@/services/auth'
import { getInventoryUsers, type InventoryUser } from '@/services/users'

type Device = {
  id: number
  sede?: string
  usuario_asignado?: string | null
  estado?: string
  origen?: string
  [key: string]: unknown
}

type BucketFilter = 'all' | 'assigned' | 'unassigned' | 'baja'

const SEDES = ['CALLE 72', 'CALLE 94', 'VENADOS', 'CALI', 'BARRANQUILLA']

const BUCKET_LABELS: Record<BucketFilter, string> = {
  all: 'Todo el inventario',
  assigned: 'Con usuario asignado',
  unassigned: 'Sin asignar',
  baja: 'De baja',
}

const filterAssignUsers = createFilterOptions<InventoryUser>({
  stringify: (u) =>
    `${u.nombre} ${u.usuario} ${u.email} ${u.documento} ${u.sede ?? ''} ${u.cargo ?? ''}`,
})

/** Altura de la fila de datos (compact) + panel de acciones bajo la fila expandida. */
const GENERAL_INV_DATA_ROW_PX = 52
const GENERAL_INV_ACTIONS_PANEL_PX = 240

function deviceMatchesSearchQuery(device: Device, raw: string): boolean {
  const q = raw.trim().toLowerCase()
  if (!q) return true
  const tokens = q.split(/\s+/).filter(Boolean)
  const hay = Object.values(device)
    .filter((v) => v != null && v !== '')
    .map((v) => String(v).toLowerCase())
    .join(' ')
  return tokens.every((t) => hay.includes(t))
}

const EDIT_FIELD_KEYS = DEVICE_EDIT_FIELD_KEYS

export default function GeneralInventarioPage() {
  const superOk = isSuperAdmin()
  const [devices, setDevices] = useState<Device[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sedeFilter, setSedeFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null)
  const [bucket, setBucket] = useState<BucketFilter>('all')
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<Device | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveSede, setMoveSede] = useState('')
  const [moveCiudad, setMoveCiudad] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignUsers, setAssignUsers] = useState<InventoryUser[]>([])
  const [assignUsersLoading, setAssignUsersLoading] = useState(false)
  const [assignSelectedUser, setAssignSelectedUser] = useState<InventoryUser | null>(null)
  const [assignNombre, setAssignNombre] = useState('')
  const [assignCorreo, setAssignCorreo] = useState('')

  const [actionConfirmOpen, setActionConfirmOpen] = useState(false)
  const [actionConfirmTitle, setActionConfirmTitle] = useState('')
  const [actionConfirmBody, setActionConfirmBody] = useState('')
  const [actionConfirmBusy, setActionConfirmBusy] = useState(false)
  const pendingConfirmedActionRef: MutableRefObject<null | (() => Promise<void>)> = useRef(null)

  const requestActionConfirm = useCallback((title: string, body: string, action: () => Promise<void>) => {
    setActionConfirmTitle(title)
    setActionConfirmBody(body)
    pendingConfirmedActionRef.current = action
    setActionConfirmOpen(true)
  }, [])

  const closeActionConfirm = useCallback(() => {
    if (actionConfirmBusy) return
    setActionConfirmOpen(false)
    pendingConfirmedActionRef.current = null
  }, [actionConfirmBusy])

  const runConfirmedAction = useCallback(async () => {
    const fn = pendingConfirmedActionRef.current
    if (!fn) {
      setActionConfirmOpen(false)
      return
    }
    setActionConfirmBusy(true)
    try {
      await fn()
      setActionConfirmOpen(false)
      pendingConfirmedActionRef.current = null
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo completar la acción')
    } finally {
      setActionConfirmBusy(false)
    }
  }, [])

  const load = useCallback(async () => {
    if (!superOk) return
    setLoadError(null)
    try {
      const data = await getDevices()
      setDevices(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Error al cargar equipos')
    }
  }, [superOk])

  useEffect(() => {
    load()
  }, [load])

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchesSede = sedeFilter
        ? String(device.sede || '').toUpperCase() === sedeFilter.toUpperCase()
        : true
      if (!matchesSede) return false

      const ua = String(device.usuario_asignado || '').trim()
      const estadoU = String(device.estado || '').toUpperCase()
      const origenU = String(device.origen || '').toUpperCase()

      if (bucket === 'assigned') {
        if (ua.length === 0) return false
      } else if (bucket === 'unassigned') {
        if (ua.length > 0) return false
      } else if (bucket === 'baja') {
        if (estadoU !== 'DE_BAJA' && origenU !== 'BAJA') return false
      }

      return deviceMatchesSearchQuery(device, searchQuery)
    })
  }, [devices, sedeFilter, bucket, searchQuery])

  const filterSummarySede = sedeFilter.trim() || 'Todas las sedes'
  const filterSummaryScope = BUCKET_LABELS[bucket]
  const filtersActive = Boolean(sedeFilter.trim()) || bucket !== 'all'

  const selectedRow = useMemo(
    () => filteredDevices.find((d) => d.id === selectedRowId) ?? null,
    [filteredDevices, selectedRowId],
  )

  useEffect(() => {
    if (selectedRowId == null) return
    if (!filteredDevices.some((d) => d.id === selectedRowId)) {
      setSelectedRowId(null)
    }
  }, [filteredDevices, selectedRowId])

  const origenColumn: GridColDef = {
    field: 'origen',
    headerName: 'ORIGEN',
    minWidth: 110,
    flex: 0.8,
    renderCell: (params) => {
      const origen = String(params.row.origen || '').trim().toUpperCase()
      if (origen === 'DEVOLUCION') return '🔁 DEVOLUCION'
      if (origen === 'REPARACION') return '🔧 REPARACION'
      if (origen === 'BAJA') return '❌ BAJA'
      return '🆕 NUEVO'
    },
  }

  const baseColumns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'sede', headerName: 'SEDE', minWidth: 110, flex: 0.8 },
    { field: 'usuario_asignado', headerName: 'USUARIO ASIGNADO', minWidth: 140, flex: 1.2 },
    { field: 'placa_equipo', headerName: 'PLACA EQUIPO', minWidth: 120, flex: 0.9 },
    { field: 'estado', headerName: 'ESTADO', minWidth: 110, flex: 0.8 },
    origenColumn,
    { field: 'nombre_equipo', headerName: 'NOMBRE EQUIPO', minWidth: 140, flex: 1 },
    { field: 'serial_number', headerName: 'SERIAL', minWidth: 120, flex: 0.8 },
    { field: 'tipo_contrato', headerName: 'TIPO CONTRATO', minWidth: 120, flex: 0.8 },
    { field: 'tipo_equipo', headerName: 'TIPO EQUIPO', minWidth: 130, flex: 0.9 },
    { field: 'marca', headerName: 'MARCA', minWidth: 100, flex: 0.7 },
    { field: 'modelo', headerName: 'MODELO', minWidth: 110, flex: 0.8 },
    { field: 'sistema_operativo', headerName: 'SISTEMA OPERATIVO', minWidth: 130, flex: 1 },
    { field: 'tipo_procesador', headerName: 'PROCESADOR', minWidth: 130, flex: 1 },
    { field: 'capacidad_ram', headerName: 'RAM', minWidth: 90, flex: 0.6 },
    { field: 'tipo_ram', headerName: 'TIPO RAM', minWidth: 90, flex: 0.6 },
    { field: 'tipo_disco', headerName: 'TIPO DISCO', minWidth: 110, flex: 0.8 },
    { field: 'capacidad_disco', headerName: 'CAPACIDAD DISCO', minWidth: 110, flex: 0.8 },
  ]

  const columns: GridColDef[] = baseColumns

  function placaNorm(row: Device): string {
    return String(row.placa_equipo || '').trim()
  }

  function isDeBaja(row: Device): boolean {
    const e = String(row.estado || '').toUpperCase()
    const o = String(row.origen || '').toUpperCase()
    return e === 'DE_BAJA' || o === 'BAJA'
  }

  async function applyReturnAction(row: Device, accion: ReturnDeviceAccion) {
    const placa = placaNorm(row)
    if (placa) {
      await returnDeviceByPlaca(placa, accion)
      return
    }
    const clearUsers = {
      usuario_asignado: null,
      nombre_usuario_asignado: null,
    }
    if (accion === 'BAJA') {
      await adminPatchDevice(row.id, { ...clearUsers, estado: 'DE_BAJA', origen: 'BAJA' })
    } else if (accion === 'REASIGNAR') {
      await adminPatchDevice(row.id, { ...clearUsers, estado: 'EN_BODEGA', origen: 'DEVOLUCION' })
    } else {
      await adminPatchDevice(row.id, { ...clearUsers, estado: 'EN_REPARACION', origen: 'REPARACION' })
    }
  }

  async function openAssignDialogForRow(row: Device) {
    setSelectedRowId(row.id)
    setAssignOpen(true)
    setAssignSelectedUser(null)
    setAssignNombre(String(row.nombre_usuario_asignado || '').trim())
    setAssignCorreo(String(row.correo_usuario || '').trim())
    setAssignUsersLoading(true)
    try {
      const data = await getInventoryUsers()
      const list = Array.isArray(data) ? [...data] : []
      list.sort((a, b) =>
        String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }),
      )
      setAssignUsers(list)
      const cur = String(row.usuario_asignado || '').trim().toLowerCase()
      if (cur) {
        const hit = list.find((u) => String(u.usuario || '').trim().toLowerCase() === cur)
        if (hit) {
          setAssignSelectedUser(hit)
          setAssignNombre(String(hit.nombre || '').trim())
          setAssignCorreo(String(hit.email || '').trim())
        }
      }
    } catch {
      setAssignUsers([])
      alert('No se pudo cargar el maestro de usuarios. Revise la sesión o intente de nuevo.')
    } finally {
      setAssignUsersLoading(false)
    }
  }

  function requestSaveAssignUser() {
    const pick = assignSelectedUser
    if (!pick || !String(pick.usuario || '').trim()) {
      alert('Seleccione un usuario del listado del maestro.')
      return
    }
    const u = String(pick.usuario).trim()
    const nom = assignNombre.trim()
    requestActionConfirm(
      'Asignar equipo',
      `¿Desea realizar esta acción? El equipo quedará asignado al usuario de red «${u}»` +
        (nom ? ` (${nom})` : '') +
        '. El cambio quedará registrado en el historial de movimientos.',
      saveAssignUserExecute,
    )
  }

  async function saveAssignUserExecute() {
    if (!selectedRow) return
    const pick = assignSelectedUser
    if (!pick || !String(pick.usuario || '').trim()) return
    const u = String(pick.usuario).trim()
    setActionBusy(true)
    try {
      await adminAssignUserToDevice(selectedRow.id, {
        usuario_asignado: u,
        nombre_usuario_asignado: assignNombre.trim() || null,
        correo_usuario: assignCorreo.trim() || null,
      })
      setAssignOpen(false)
      setAssignSelectedUser(null)
      await load()
    } catch (e: unknown) {
      throw e instanceof Error ? e : new Error('No se pudo asignar')
    } finally {
      setActionBusy(false)
    }
  }

  function openEdit(row: Device) {
    setEditRow(row)
    const next: Record<string, string> = {}
    for (const { key } of EDIT_FIELD_KEYS) {
      const v = row[key]
      next[key] = v != null && v !== undefined ? String(v) : ''
    }
    setEditForm(next)
    setEditOpen(true)
  }

  function closeEdit() {
    setEditOpen(false)
    setEditRow(null)
    setEditForm({})
  }

  function requestSaveEdit() {
    if (!editRow) return
    requestActionConfirm(
      'Guardar cambios del equipo',
      '¿Desea realizar esta acción? Se actualizarán los datos del equipo en inventario y, si aplica, se registrará en la traza.',
      saveEditExecute,
    )
  }

  async function saveEditExecute() {
    if (!editRow) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      for (const { key } of EDIT_FIELD_KEYS) {
        const v = editForm[key]
        if (v !== undefined) body[key] = v === '' ? null : v
      }
      await adminPatchDevice(editRow.id, body)
      closeEdit()
      await load()
    } catch (e: unknown) {
      throw e instanceof Error ? e : new Error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  function requestDeleteDevice(row: Device) {
    const placa = String(row.placa_equipo || row.id)
    requestActionConfirm(
      'Eliminar equipo',
      `¿Desea realizar esta acción? Se eliminará definitivamente el equipo ${placa} (id ${row.id}) y su historial de movimientos. Esta operación no se puede deshacer.`,
      () => deleteDeviceExecute(row),
    )
  }

  async function deleteDeviceExecute(row: Device) {
    try {
      await adminDeleteDevice(row.id)
      if (selectedRowId === row.id) setSelectedRowId(null)
      await load()
    } catch (e: unknown) {
      throw e instanceof Error ? e : new Error('No se pudo eliminar')
    }
  }

  async function executeReturnAction(row: Device, accion: ReturnDeviceAccion) {
    setActionBusy(true)
    try {
      await applyReturnAction(row, accion)
      await load()
    } catch (e: unknown) {
      throw e instanceof Error ? e : new Error('No se pudo completar la acción')
    } finally {
      setActionBusy(false)
    }
  }

  function requestReturnAction(row: Device, accion: ReturnDeviceAccion, title: string, body: string) {
    requestActionConfirm(title, body, () => executeReturnAction(row, accion))
  }

  /** Quita marca de baja vía admin: vuelve al inventario operativo; el resto se ajusta con Editar. */
  function requestReactivarDesdeBaja(row: Device) {
    requestActionConfirm(
      'Reactivar equipo (quitar baja)',
      '¿Desea realizar esta acción? El equipo volverá al inventario operativo con origen DEVOLUCIÓN: ' +
        'si no tiene usuario asignado quedará EN_BODEGA; si ya tiene usuario, ASIGNADO. Luego puede usar Editar para otros ajustes.',
      () => reactivarDesdeBajaExecute(row),
    )
  }

  async function reactivarDesdeBajaExecute(row: Device) {
    setActionBusy(true)
    try {
      const tieneUsuario = String(row.usuario_asignado || '').trim().length > 0
      await adminPatchDevice(row.id, {
        origen: 'DEVOLUCION',
        estado: tieneUsuario ? 'ASIGNADO' : 'EN_BODEGA',
      })
      await load()
    } catch (e: unknown) {
      throw e instanceof Error ? e : new Error('No se pudo reactivar el equipo')
    } finally {
      setActionBusy(false)
    }
  }

  function openMoveDialogForRow(row: Device) {
    setSelectedRowId(row.id)
    setMoveSede(String(row.sede || ''))
    setMoveCiudad(String(row.ciudad || ''))
    setMoveOpen(true)
  }

  function requestSaveMove() {
    if (!selectedRow) return
    requestActionConfirm(
      'Mover sede / ciudad',
      `¿Desea realizar esta acción? Se actualizará la sede y ciudad del equipo (id ${selectedRow.id}` +
        `${placaNorm(selectedRow) ? `, placa ${placaNorm(selectedRow)}` : ''}).`,
      saveMoveExecute,
    )
  }

  async function saveMoveExecute() {
    if (!selectedRow) return
    setActionBusy(true)
    try {
      await adminPatchDevice(selectedRow.id, {
        sede: moveSede.trim() || null,
        ciudad: moveCiudad.trim() || null,
      })
      setMoveOpen(false)
      await load()
    } catch (e: unknown) {
      throw e instanceof Error ? e : new Error('No se pudo mover')
    } finally {
      setActionBusy(false)
    }
  }

  const rowHandlersRef = useRef({
    openEdit: (_row: Device) => {},
    requestDeleteDevice: (_row: Device) => {},
    requestReturnAction: (_row: Device, _a: ReturnDeviceAccion, _t: string, _b: string) => {},
    requestReactivarDesdeBaja: (_row: Device) => {},
    openMoveDialogForRow: (_row: Device) => {},
    openAssignDialogForRow: (_row: Device) => {},
    placaNorm: (_row: Device) => '',
    isDeBaja: (_row: Device) => false,
    setSelectedRowId: (_id: number | null) => {},
  })
  rowHandlersRef.current = {
    openEdit,
    requestDeleteDevice,
    requestReturnAction,
    requestReactivarDesdeBaja,
    openMoveDialogForRow,
    openAssignDialogForRow,
    placaNorm,
    isDeBaja,
    setSelectedRowId,
  }

  const GeneralInvGridRow = useCallback(
    function GeneralInvGridRowCb(props: GridRowProps) {
      const { style, className, rowHeight, rowId, row, ...gridRowProps } = props
      const h = rowHandlersRef.current
      const rowModel = row as Device
      const idNum = Number(rowId)
      const expanded = selectedRowId !== null && idNum === selectedRowId
      const innerRowHeight =
        expanded
          ? GENERAL_INV_DATA_ROW_PX
          : rowHeight === 'auto'
            ? 'auto'
            : rowHeight

      return (
        <Box
          className={className}
          style={style}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <GridRow {...gridRowProps} row={row} rowId={rowId} rowHeight={innerRowHeight} />
          {expanded && (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                borderTop: 2,
                borderColor: 'primary.main',
                px: 2,
                py: 1.5,
                bgcolor: 'background.default',
              }}
            >
              <Stack spacing={1}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    Equipo seleccionado:{' '}
                    <strong>{h.placaNorm(rowModel) || `id ${rowModel.id}`}</strong>
                    {' · '}
                    {String(rowModel.sede || '—')} · {String(rowModel.estado || '—')}
                    {String(rowModel.usuario_asignado || '').trim()
                      ? ` · ${String(rowModel.usuario_asignado)}`
                      : ''}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<CloseIcon fontSize="small" />}
                    onClick={() => h.setSelectedRowId(null)}
                    disabled={actionBusy}
                  >
                    Cerrar
                  </Button>
                </Stack>
                <Divider />
                <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={actionBusy}
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={() => h.openEdit(rowModel)}
                  >
                    Editar
                  </Button>
                  {h.isDeBaja(rowModel) && (
                    <Button
                      size="small"
                      color="success"
                      variant="contained"
                      disabled={actionBusy}
                      startIcon={<RestartAltIcon fontSize="small" />}
                      onClick={() => h.requestReactivarDesdeBaja(rowModel)}
                    >
                      Reactivar (quitar baja)
                    </Button>
                  )}
                  <Tooltip title={h.isDeBaja(rowModel) ? 'El equipo ya está de baja' : ''}>
                    <span>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        disabled={actionBusy || h.isDeBaja(rowModel)}
                        startIcon={<BlockOutlinedIcon fontSize="small" />}
                        onClick={() =>
                          h.requestReturnAction(
                            rowModel,
                            'BAJA',
                            'Dar de baja',
                            `¿Desea realizar esta acción? Se dará de baja el equipo ${h.placaNorm(rowModel) || rowModel.id}: se quitará la asignación y quedará en estado DE_BAJA.`,
                          )
                        }
                      >
                        Dar de baja
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip
                    title={
                      h.isDeBaja(rowModel)
                        ? 'Use “Reactivar” si solo desea quitar la baja. Habilitar para asignación deja el equipo en bodega y sin usuario.'
                        : 'Quita la asignación y deja el equipo EN_BODEGA, listo para asignarlo a otra persona (origen devolución).'
                    }
                  >
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={actionBusy}
                        startIcon={<Inventory2OutlinedIcon fontSize="small" />}
                        onClick={() =>
                          h.requestReturnAction(
                            rowModel,
                            'REASIGNAR',
                            'Habilitar para asignación',
                            `¿Desea realizar esta acción? El equipo ${h.placaNorm(rowModel) || rowModel.id} quedará en bodega (EN_BODEGA), sin usuario asignado, listo para una nueva asignación. Se registrará como devolución.`,
                          )
                        }
                      >
                        Habilitar para asignación
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip
                    title={
                      h.isDeBaja(rowModel)
                        ? 'Primero use “Reactivar (quitar baja)” y luego puede asignar el equipo.'
                        : 'Asigna o reasigna el equipo a un usuario del maestro (estado ASIGNADO). Queda registrado en la traza.'
                    }
                  >
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        disabled={actionBusy || h.isDeBaja(rowModel)}
                        startIcon={<PersonAddOutlinedIcon fontSize="small" />}
                        onClick={() => h.openAssignDialogForRow(rowModel)}
                      >
                        Asignar a…
                      </Button>
                    </span>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={actionBusy}
                    startIcon={<PlaceOutlinedIcon fontSize="small" />}
                    onClick={() => h.openMoveDialogForRow(rowModel)}
                  >
                    Mover sede / ciudad
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={actionBusy}
                    startIcon={<DeleteOutlineIcon fontSize="small" />}
                    onClick={() => h.requestDeleteDevice(rowModel)}
                  >
                    Eliminar
                  </Button>
                </Stack>
                <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>
                    Movimientos
                  </Typography>
                  <Button
                    size="small"
                    component={Link}
                    href={
                      h.placaNorm(rowModel)
                        ? `/movements/assign?placa=${encodeURIComponent(h.placaNorm(rowModel))}`
                        : '/movements/assign'
                    }
                    variant="text"
                    disabled={!h.placaNorm(rowModel)}
                    startIcon={<AssignmentOutlinedIcon fontSize="small" />}
                  >
                    Asignar equipo
                  </Button>
                  <Tooltip
                    title={
                      String(rowModel.usuario_asignado || '').trim()
                        ? ''
                        : 'El cambio de equipo requiere un equipo origen con usuario asignado'
                    }
                  >
                    <span>
                      <Button
                        size="small"
                        component={Link}
                        href="/movements/change"
                        variant="text"
                        disabled={!String(rowModel.usuario_asignado || '').trim()}
                        startIcon={<SwapHorizIcon fontSize="small" />}
                      >
                        Cambio de equipo
                      </Button>
                    </span>
                  </Tooltip>
                  <Button
                    size="small"
                    component={Link}
                    href="/movements/return"
                    variant="text"
                    startIcon={<UndoIcon fontSize="small" />}
                  >
                    Devolución (formulario)
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </Box>
      )
    },
    [selectedRowId, actionBusy],
  )

  if (!superOk) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <strong>General de inventario</strong> está restringido al rol super administrador. Si necesita
          acceso, contacte al administrador general.
        </Alert>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 0, md: 1 },
        minHeight: 'calc(100vh - 125px)',
        overflow: 'hidden',
      }}
    >
      <Stack spacing={1} sx={{ mt: 0.5, mb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              General de inventario
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Pulse una fila para ver acciones debajo · Solo super administrador
            </Typography>
          </Box>
          <Tooltip
            title="Incluye asignados, sin asignar y de baja. Use Filtros para sede y alcance; la búsqueda cruza todos los campos visibles."
            arrow
            placement="left"
          >
            <IconButton size="small" aria-label="Información sobre esta vista" color="default">
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        {loadError && (
          <Alert severity="error" onClose={() => setLoadError(null)}>
            {loadError}
          </Alert>
        )}

        <Paper
          variant="outlined"
          sx={{
            p: 1.25,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1.25,
            alignItems: { md: 'center' },
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar placa, serial, usuario, marca, modelo…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, minWidth: { xs: '100%', md: 200 } }}
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
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'space-between', md: 'flex-start' } }}
          >
            <Button
              id="general-inv-filters-button"
              aria-controls={filterMenuAnchor ? 'general-inv-filters-popover' : undefined}
              aria-expanded={filterMenuAnchor ? 'true' : undefined}
              variant={filtersActive ? 'contained' : 'outlined'}
              color={filtersActive ? 'primary' : 'inherit'}
              size="small"
              startIcon={<FilterListIcon />}
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            >
              Filtros
            </Button>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                flex: { xs: '1 1 100%', md: 'none' },
                order: { xs: 3, md: 0 },
                maxWidth: { md: 280 },
                textAlign: { xs: 'left', md: 'right' },
                ml: { md: 'auto' },
              }}
            >
              {filterSummarySede} · {filterSummaryScope}
              {filteredDevices.length !== devices.length ? ` · ${filteredDevices.length} filas` : ''}
            </Typography>
          </Stack>
        </Paper>

        <Popover
          id="general-inv-filters-popover"
          open={Boolean(filterMenuAnchor)}
          anchorEl={filterMenuAnchor}
          onClose={() => setFilterMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: { mt: 0.5, minWidth: 300, maxWidth: 'min(100vw - 24px, 420px)' },
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Sede
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mb: 2 }}>
              <Button
                size="small"
                variant={sedeFilter === '' ? 'contained' : 'outlined'}
                onClick={() => setSedeFilter('')}
              >
                Todas
              </Button>
              {SEDES.map((s) => (
                <Button
                  key={s}
                  size="small"
                  variant={sedeFilter.toUpperCase() === s ? 'contained' : 'outlined'}
                  onClick={() => setSedeFilter(s)}
                >
                  {s}
                </Button>
              ))}
            </Stack>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Alcance
            </Typography>
            <Stack spacing={0.75}>
              <Button
                size="small"
                fullWidth
                variant={bucket === 'all' ? 'contained' : 'outlined'}
                onClick={() => setBucket('all')}
              >
                Todo el inventario
              </Button>
              <Button
                size="small"
                fullWidth
                variant={bucket === 'assigned' ? 'contained' : 'outlined'}
                onClick={() => setBucket('assigned')}
              >
                Con usuario asignado
              </Button>
              <Button
                size="small"
                fullWidth
                variant={bucket === 'unassigned' ? 'contained' : 'outlined'}
                onClick={() => setBucket('unassigned')}
              >
                Sin asignar
              </Button>
              <Button
                size="small"
                fullWidth
                variant={bucket === 'baja' ? 'contained' : 'outlined'}
                color={bucket === 'baja' ? 'error' : 'inherit'}
                onClick={() => setBucket('baja')}
              >
                De baja
              </Button>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Button
                size="small"
                onClick={() => {
                  setSedeFilter('')
                  setBucket('all')
                  setSearchQuery('')
                }}
              >
                Limpiar todo
              </Button>
              <Button size="small" variant="contained" onClick={() => setFilterMenuAnchor(null)}>
                Listo
              </Button>
            </Stack>
          </Box>
        </Popover>
      </Stack>

      <Paper
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <DataGrid
          rows={filteredDevices}
          columns={columns}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
          slots={{ row: GeneralInvGridRow }}
          getRowHeight={({ id }) =>
            selectedRowId != null && (id === selectedRowId || Number(id) === selectedRowId)
              ? GENERAL_INV_DATA_ROW_PX + GENERAL_INV_ACTIONS_PANEL_PX
              : undefined
          }
          onRowClick={(params) => {
            const id = Number(params.id)
            setSelectedRowId((prev) => (prev === id ? null : id))
          }}
          getRowClassName={(params) =>
            params.id === selectedRowId ? 'general-inv-row-selected' : ''
          }
          pageSizeOptions={[50, 100, 200]}
          initialState={{
            pagination: { paginationModel: { pageSize: 50, page: 0 } },
            columns: {
              columnVisibilityModel: {
                sistema_operativo: false,
                tipo_procesador: false,
                tipo_ram: false,
                tipo_disco: false,
                capacidad_disco: false,
              },
            },
          }}
          density="compact"
          sx={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            '& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader': {
              py: 0.5,
            },
            '& .MuiDataGrid-row': { cursor: 'pointer' },
            '& .general-inv-row-selected': {
              bgcolor: 'action.selected',
            },
          }}
        />
      </Paper>

      <Dialog
        open={actionConfirmOpen}
        onClose={closeActionConfirm}
        maxWidth="sm"
        fullWidth
        aria-labelledby="general-inv-confirm-title"
      >
        <DialogTitle id="general-inv-confirm-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpOutlineIcon color="primary" />
          {actionConfirmTitle}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ whiteSpace: 'pre-line' }}>{actionConfirmBody}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeActionConfirm} disabled={actionConfirmBusy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={actionConfirmBusy}
            startIcon={actionConfirmBusy ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
            onClick={() => void runConfirmedAction()}
          >
            {actionConfirmBusy ? 'Procesando…' : 'Sí, confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={assignOpen} onClose={() => !actionBusy && setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Asignar equipo (id {selectedRow?.id ?? ''}) ·{' '}
          {selectedRow ? placaNorm(selectedRow) || '—' : '—'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Elija un usuario del maestro (misma lista que en Gestión de usuarios). Puede ajustar nombre y correo
              antes de confirmar. Si el equipo ya tenía otro usuario, quedará registrado como reasignación en el
              historial.
            </Typography>
            {assignUsersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <Autocomplete<InventoryUser, false, false, false>
                options={assignUsers}
                value={assignSelectedUser}
                onChange={(_e, v) => {
                  setAssignSelectedUser(v)
                  if (v) {
                    setAssignNombre(String(v.nombre || '').trim())
                    setAssignCorreo(String(v.email || '').trim())
                  }
                }}
                filterOptions={filterAssignUsers}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                getOptionLabel={(u) => {
                  const nom = String(u.nombre || '').trim()
                  const usr = String(u.usuario || '').trim()
                  return nom && usr ? `${nom} — ${usr}` : usr || nom || '—'
                }}
                renderOption={(props, u) => (
                  <li {...props}>
                    <Box sx={{ py: 0.25 }}>
                      <Typography variant="body2">
                        {String(u.nombre || '').trim()} — <strong>{String(u.usuario || '').trim()}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {String(u.email || '').trim()}
                        {u.sede ? ` · ${u.sede}` : ''}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Usuario del maestro (obligatorio)"
                    required
                    size="small"
                    placeholder="Buscar por nombre, usuario, correo o documento"
                  />
                )}
                noOptionsText={
                  assignUsers.length === 0 ? 'No hay usuarios en el maestro. Créelos en Gestión de usuarios.' : 'Sin coincidencias'
                }
              />
            )}
            <TextField
              label="Nombre completo (se rellena al elegir usuario; puede editar)"
              value={assignNombre}
              onChange={(e) => setAssignNombre(e.target.value)}
              fullWidth
              size="small"
              disabled={assignUsersLoading}
            />
            <TextField
              label="Correo (se rellena al elegir usuario; puede editar)"
              value={assignCorreo}
              onChange={(e) => setAssignCorreo(e.target.value)}
              fullWidth
              size="small"
              type="email"
              disabled={assignUsersLoading}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)} disabled={actionBusy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={actionBusy ? <CircularProgress size={16} color="inherit" /> : <PersonAddOutlinedIcon />}
            onClick={() => requestSaveAssignUser()}
            disabled={actionBusy || assignUsersLoading || !assignSelectedUser}
          >
            {actionBusy ? 'Guardando…' : 'Asignar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={moveOpen} onClose={() => !actionBusy && setMoveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mover sede / ciudad (id {selectedRow?.id ?? ''})</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Sede"
              value={moveSede}
              onChange={(e) => setMoveSede(e.target.value)}
              fullWidth
              size="small"
              placeholder="Ej. CALLE 94"
            />
            <TextField
              label="Ciudad"
              value={moveCiudad}
              onChange={(e) => setMoveCiudad(e.target.value)}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveOpen(false)} disabled={actionBusy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={actionBusy ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
            onClick={() => requestSaveMove()}
            disabled={actionBusy}
          >
            {actionBusy ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={closeEdit} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>Editar equipo (id {editRow?.id ?? ''})</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ pt: 1 }}>
            {EDIT_FIELD_KEYS.map(({ key, label }) => (
              <Grid size={{ xs: 12, sm: 6 }} key={key}>
                <TextField
                  label={label}
                  name={key}
                  value={editForm[key] ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                  fullWidth
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
            onClick={() => requestSaveEdit()}
            disabled={saving}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
