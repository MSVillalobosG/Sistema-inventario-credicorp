'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ChipProps } from '@mui/material/Chip'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import Link from 'next/link'
import Profile from '@/app/(DashboardLayout)/layout/header/Profile'
import {
  adminAssignUserToDevice,
  adminDeleteDevice,
  adminPatchDevice,
  getDevices,
  returnDeviceByPlaca,
  type ReturnDeviceAccion,
} from '@/services/devices'
import { canWriteInventory } from '@/services/auth'
import { DEVICE_EDIT_FIELD_KEYS } from '@/lib/deviceEditFields'
import { getInventoryUsers, type InventoryUser } from '@/services/users'

/** Tipografía solicitada para esta vista */
const DEVICES_FONT_FAMILY = 'Arial, "Helvetica Neue", Helvetica, sans-serif'

type Device = {
  id: number
  sede?: string
  usuario_asignado?: string | null
  estado?: string
  origen?: string
  placa_equipo?: string | null
  [key: string]: unknown
}

function placaNorm(row: Device): string {
  return String(row.placa_equipo || '').trim()
}

type ChipColor = NonNullable<ChipProps['color']>

function estadoVisual(estado: string | null | undefined): { label: string; color: ChipColor } {
  const e = String(estado || '')
    .trim()
    .toUpperCase()
  const map: Record<string, { label: string; color: ChipColor }> = {
    ASIGNADO: { label: 'Asignado', color: 'primary' },
    EN_BODEGA: { label: 'En bodega', color: 'info' },
    EN_REPARACION: { label: 'Reparación', color: 'warning' },
    DE_BAJA: { label: 'De baja', color: 'error' },
    CAMBIO_PENDIENTE: { label: 'Cambio pend.', color: 'warning' },
  }
  if (map[e]) return map[e]
  if (!e) return { label: '—', color: 'default' }
  return { label: e, color: 'default' }
}

function origenVisual(origen: string | null | undefined): { label: string; color: ChipColor } {
  const o = String(origen || '')
    .trim()
    .toUpperCase()
  const map: Record<string, { label: string; color: ChipColor }> = {
    DEVOLUCION: { label: 'Devolución', color: 'info' },
    REPARACION: { label: 'Reparación', color: 'warning' },
    BAJA: { label: 'Baja', color: 'error' },
    NUEVO: { label: 'Nuevo', color: 'primary' },
  }
  return map[o] ?? { label: 'Nuevo', color: 'primary' }
}

export default function DevicesPage() {
  const canWrite = canWriteInventory()

  const [devices, setDevices] = useState<Device[]>([])
  const [sedeFilter, setSedeFilter] = useState('')
  const [onlyUnassigned, setOnlyUnassigned] = useState(false)

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuRow, setMenuRow] = useState<Device | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<Device | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignRow, setAssignRow] = useState<Device | null>(null)
  const [assignUsers, setAssignUsers] = useState<InventoryUser[]>([])
  const [assignUsersLoading, setAssignUsersLoading] = useState(false)
  const [assignSelectedUser, setAssignSelectedUser] = useState<InventoryUser | null>(null)
  const [assignNombre, setAssignNombre] = useState('')
  const [assignCorreo, setAssignCorreo] = useState('')

  const [actionBusy, setActionBusy] = useState(false)

  const sedesDisponibles = ['CALLE 72', 'CALLE 94', 'VENADOS', 'CALI', 'BARRANQUILLA']

  const loadDevices = useCallback(async () => {
    const data = await getDevices()
    setDevices(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  const filteredDevices = devices.filter((device) => {
    const estadoUpper = (device.estado || '').toUpperCase()
    const origenUpper = (device.origen || '').toUpperCase()

    if (estadoUpper === 'DE_BAJA' || origenUpper === 'BAJA') {
      return false
    }

    const estado = estadoUpper
    const sinAsignar = !device.usuario_asignado

    if (estado === 'CAMBIO_PENDIENTE' && sinAsignar) {
      return false
    }

    const matchesSede = sedeFilter
      ? device.sede?.toUpperCase() === sedeFilter.toUpperCase()
      : true

    if (onlyUnassigned) {
      return !device.usuario_asignado && matchesSede
    }

    const isAssigned = !!device.usuario_asignado

    return isAssigned && matchesSede
  })

  const closeMenu = () => {
    setMenuAnchor(null)
    setMenuRow(null)
  }

  const openMenu = (e: React.MouseEvent<HTMLElement>, row: Device) => {
    e.stopPropagation()
    setMenuRow(row)
    setMenuAnchor(e.currentTarget)
  }

  const openEdit = (row: Device) => {
    setEditRow(row)
    const next: Record<string, string> = {}
    for (const { key } of DEVICE_EDIT_FIELD_KEYS) {
      const v = row[key]
      next[key] = v != null && v !== undefined ? String(v) : ''
    }
    setEditForm(next)
    setEditOpen(true)
    closeMenu()
  }

  const saveEdit = async () => {
    if (!editRow) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      for (const { key } of DEVICE_EDIT_FIELD_KEYS) {
        const v = editForm[key]
        if (v !== undefined) body[key] = v === '' ? null : v
      }
      await adminPatchDevice(editRow.id, body)
      setEditOpen(false)
      setEditRow(null)
      setEditForm({})
      await loadDevices()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const openAssign = async (row: Device) => {
    setAssignRow(row)
    setAssignOpen(true)
    setAssignSelectedUser(null)
    setAssignNombre(String(row.nombre_usuario_asignado || '').trim())
    setAssignCorreo(String(row.correo_usuario || '').trim())
    setAssignUsersLoading(true)
    closeMenu()
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
      alert('No se pudo cargar el maestro de usuarios.')
    } finally {
      setAssignUsersLoading(false)
    }
  }

  const saveAssign = async () => {
    const row = assignRow
    const pick = assignSelectedUser
    if (!row || !pick || !String(pick.usuario || '').trim()) {
      alert('Seleccione un usuario del listado.')
      return
    }
    if (
      !window.confirm(
        `¿Asignar el equipo a «${String(pick.usuario).trim()}»? Quedará registrado en el historial.`,
      )
    )
      return
    setActionBusy(true)
    try {
      await adminAssignUserToDevice(row.id, {
        usuario_asignado: String(pick.usuario).trim(),
        nombre_usuario_asignado: assignNombre.trim() || null,
        correo_usuario: assignCorreo.trim() || null,
      })
      setAssignOpen(false)
      setAssignRow(null)
      await loadDevices()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo asignar')
    } finally {
      setActionBusy(false)
    }
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

  const runReturn = async (row: Device, accion: ReturnDeviceAccion, title: string, detail: string) => {
    if (!window.confirm(`${title}\n\n${detail}`)) return
    setActionBusy(true)
    try {
      await applyReturnAction(row, accion)
      await loadDevices()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error en la acción')
    } finally {
      setActionBusy(false)
      closeMenu()
    }
  }

  const runDelete = async (row: Device) => {
    const placa = placaNorm(row) || String(row.id)
    if (
      !window.confirm(
        `¿Eliminar definitivamente el equipo ${placa} (id ${row.id}) y su historial de movimientos? Esta acción no se puede deshacer.`,
      )
    )
      return
    setActionBusy(true)
    try {
      await adminDeleteDevice(row.id)
      await loadDevices()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar')
    } finally {
      setActionBusy(false)
      closeMenu()
    }
  }

  const columns: GridColDef[] = useMemo(() => {
    const extraColumns: GridColDef[] = [
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

    const estadoColumn: GridColDef = {
      field: 'estado',
      headerName: 'ESTADO',
      minWidth: 132,
      flex: 0.85,
      renderCell: (params) => {
        const ev = estadoVisual(params.row.estado as string | undefined)
        return (
          <Chip
            size="small"
            label={ev.label}
            color={ev.color}
            variant="filled"
            sx={{
              letterSpacing: 0.02,
              boxShadow: (t) => `0 1px 2px ${alpha(t.palette.common.black, 0.08)}`,
            }}
          />
        )
      },
    }

    const origenColumn: GridColDef = {
      field: 'origen',
      headerName: 'ORIGEN',
      minWidth: 128,
      flex: 0.85,
      renderCell: (params) => {
        const ov = origenVisual(params.row.origen as string | undefined)
        return (
          <Tooltip title={ov.label} placement="top" arrow>
            <Chip
              size="small"
              label={ov.label}
              color={ov.color}
              variant="outlined"
              sx={{
                maxWidth: '100%',
                '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
              }}
            />
          </Tooltip>
        )
      },
    }

    const core: GridColDef[] = [
      {
        field: 'id',
        headerName: 'ID',
        width: 72,
        align: 'right',
        headerAlign: 'right',
        renderCell: (p) => (
          <Typography variant="body2" component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {p.value ?? '—'}
          </Typography>
        ),
      },
      { field: 'sede', headerName: 'SEDE', minWidth: 110, flex: 0.8 },
      { field: 'usuario_asignado', headerName: 'USUARIO ASIGNADO', minWidth: 140, flex: 1.2 },
      {
        field: 'placa_equipo',
        headerName: 'PLACA EQUIPO',
        minWidth: 124,
        flex: 0.9,
        renderCell: (p) => (
          <Typography variant="body2" component="span" sx={{ letterSpacing: '0.02em' }}>
            {(p.value as string) || '—'}
          </Typography>
        ),
      },
      estadoColumn,
      origenColumn,
      ...extraColumns,
    ]

    if (!canWrite) return core
    return [
      ...core,
      {
        field: '_actions',
        headerName: '',
        width: 52,
        minWidth: 52,
        maxWidth: 52,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <IconButton
            size="small"
            aria-label="acciones"
            disabled={actionBusy}
            onClick={(e) => openMenu(e, params.row as Device)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        ),
      },
    ]
  }, [canWrite, actionBusy])

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 0, md: 1 },
        minHeight: 'calc(100vh - 125px)',
        overflow: 'hidden',
        fontFamily: DEVICES_FONT_FAMILY,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 1,
          mb: 1,
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h3">Dispositivos</Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" component={Link} href="/authentication/login" size="small">
            Acceso
          </Button>
          <Profile />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="small" variant={sedeFilter === '' ? 'contained' : 'outlined'} onClick={() => setSedeFilter('')}>
          Todas
        </Button>
        {sedesDisponibles.map((s) => (
          <Button
            key={s}
            size="small"
            variant={sedeFilter.toUpperCase() === s ? 'contained' : 'outlined'}
            onClick={() => setSedeFilter(s)}
          >
            {s}
          </Button>
        ))}

        <Button
          size="small"
          variant={onlyUnassigned ? 'contained' : 'outlined'}
          color="primary"
          onClick={() => setOnlyUnassigned(!onlyUnassigned)}
        >
          Equipos sin asignar
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={(theme) => ({
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
          boxShadow: `0 2px 12px ${alpha(theme.palette.common.black, 0.06)}`,
          bgcolor: theme.palette.background.paper,
        })}
      >
        <DataGrid
          rows={filteredDevices}
          columns={columns}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
          pageSizeOptions={[50, 100]}
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
          showCellVerticalBorder
          showColumnVerticalBorder
          sx={(theme) => ({
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            border: 'none',
            borderRadius: 2,
            fontFamily: DEVICES_FONT_FAMILY,
            '--DataGrid-rowBorderColor': theme.palette.divider,
            '& .MuiDataGrid-columnHeaders': {
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.35)}`,
              background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`,
            },
            '& .MuiDataGrid-columnHeader': {
              py: 1,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 400,
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              color: theme.palette.text.primary,
            },
            '& .MuiDataGrid-cell': {
              py: 0.85,
              px: 1,
              fontWeight: 400,
              fontSize: '0.8125rem',
              alignItems: 'center',
              display: 'flex',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.primary.main, 0.03),
            },
            '& .MuiDataGrid-row:nth-of-type(even)': {
              bgcolor: alpha(theme.palette.primary.main, 0.035),
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.09),
            },
          })}
        />
      </Paper>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        slotProps={{
          paper: { sx: { fontFamily: DEVICES_FONT_FAMILY } },
        }}
      >
        {menuRow && (
          <>
            <MenuItem
              disabled={actionBusy}
              onClick={() => {
                openEdit(menuRow)
              }}
            >
              Editar datos
            </MenuItem>
            <MenuItem
              disabled={actionBusy}
              onClick={() => {
                void openAssign(menuRow)
              }}
            >
              Asignar o reasignar usuario
            </MenuItem>
            <MenuItem
              disabled={actionBusy}
              onClick={() =>
                runReturn(
                  menuRow,
                  'REASIGNAR',
                  'Habilitar para asignación',
                  `El equipo ${placaNorm(menuRow) || menuRow.id} quedará en bodega (EN_BODEGA), sin usuario, listo para una nueva asignación.`,
                )
              }
            >
              Quitar asignación (a bodega)
            </MenuItem>
            <MenuItem
              disabled={actionBusy}
              onClick={() =>
                runReturn(
                  menuRow,
                  'BAJA',
                  'Dar de baja',
                  `Se dará de baja el equipo ${placaNorm(menuRow) || menuRow.id}: se quitará la asignación y quedará DE_BAJA.`,
                )
              }
            >
              Dar de baja
            </MenuItem>
            <MenuItem
              component={Link}
              href={
                placaNorm(menuRow)
                  ? `/movements/assign?placa=${encodeURIComponent(placaNorm(menuRow))}`
                  : '/movements/assign'
              }
              onClick={closeMenu}
              disabled={!placaNorm(menuRow)}
            >
              Ir a asignación (formulario)
            </MenuItem>
            <MenuItem
              disabled={actionBusy}
              onClick={() => {
                void runDelete(menuRow)
              }}
              sx={{ color: 'error.main' }}
            >
              Eliminar equipo
            </MenuItem>
          </>
        )}
      </Menu>

      <Dialog
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: { sx: { fontFamily: DEVICES_FONT_FAMILY } },
        }}
      >
        <DialogTitle>Editar equipo</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            {DEVICE_EDIT_FIELD_KEYS.map(({ key, label }) => (
              <Grid item xs={12} sm={6} key={key}>
                <TextField
                  label={label}
                  size="small"
                  fullWidth
                  value={editForm[key] ?? ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !saving && setEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveEdit()} disabled={saving}>
            {saving ? <CircularProgress size={22} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={assignOpen}
        onClose={() => !actionBusy && setAssignOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: { sx: { fontFamily: DEVICES_FONT_FAMILY } },
        }}
      >
        <DialogTitle>Asignar o reasignar usuario</DialogTitle>
        <DialogContent dividers>
          {assignUsersLoading ? (
            <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Autocomplete
                options={assignUsers}
                loading={assignUsersLoading}
                value={assignSelectedUser}
                onChange={(_e, v) => {
                  setAssignSelectedUser(v)
                  if (v) {
                    setAssignNombre(String(v.nombre || '').trim())
                    setAssignCorreo(String(v.email || '').trim())
                  }
                }}
                getOptionLabel={(o) => `${o.nombre} (${o.usuario})`}
                renderInput={(params) => <TextField {...params} label="Usuario del maestro" size="small" />}
              />
              <TextField
                label="Nombre completo"
                size="small"
                value={assignNombre}
                onChange={(e) => setAssignNombre(e.target.value)}
                fullWidth
              />
              <TextField
                label="Correo"
                size="small"
                value={assignCorreo}
                onChange={(e) => setAssignCorreo(e.target.value)}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !actionBusy && setAssignOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveAssign()} disabled={actionBusy || assignUsersLoading}>
            Guardar asignación
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
