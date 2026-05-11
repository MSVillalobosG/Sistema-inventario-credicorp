'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  FormControlLabel,
} from '@mui/material'
import { DataGrid, GridActionsCellItem, GridColDef } from '@mui/x-data-grid'
import { IconEdit, IconPlus } from '@tabler/icons-react'
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer'
import {
  createDashboardAccount,
  listDashboardAccounts,
  updateDashboardAccount,
  type DashboardAccountRow,
} from '@/services/dashboardAccounts'
import type { DashboardRole } from '@/services/auth'
import { getAuthToken, isSuperAdmin } from '@/services/auth'

const ROLE_OPTIONS: { value: DashboardRole; label: string; hint: string }[] = [
  {
    value: 'super_admin',
    label: 'Administrador general',
    hint: 'Gestiona cuentas del panel y todos los módulos',
  },
  { value: 'admin', label: 'Administrador', hint: 'Operación completa del inventario (sin gestión de cuentas)' },
  { value: 'editor', label: 'Editor', hint: 'Alta y cambios de equipos y movimientos' },
  { value: 'viewer', label: 'Solo visualización', hint: 'Consulta sin modificar datos' },
]

function roleLabel(role: string) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role
}

const emptyCreate = {
  email: '',
  display_name: '',
  password: '',
  role: 'viewer' as DashboardRole,
}

export default function ConfiguracionCuentasPage() {
  const [mounted, setMounted] = useState(false)
  const [rows, setRows] = useState<DashboardAccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editRow, setEditRow] = useState<DashboardAccountRow | null>(null)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [editForm, setEditForm] = useState({
    display_name: '',
    role: 'viewer' as DashboardRole,
    is_active: true,
    new_password: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const token = mounted ? getAuthToken() : null
  const allowed = mounted && isSuperAdmin()
  const apiReady = !!token

  const load = useCallback(async () => {
    if (!allowed || !apiReady) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError('')
    try {
      const data = await listDashboardAccounts()
      setRows(data)
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Error al cargar cuentas')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [allowed, apiReady])

  useEffect(() => {
    load()
  }, [load])

  const columns: GridColDef[] = useMemo(
    () => [
      { field: 'id', headerName: 'ID', width: 70 },
      { field: 'email', headerName: 'Correo', minWidth: 200, flex: 1 },
      { field: 'display_name', headerName: 'Nombre', minWidth: 160, flex: 0.8 },
      {
        field: 'role',
        headerName: 'Rol',
        minWidth: 200,
        flex: 0.9,
        valueGetter: (_v, row) => roleLabel(row.role),
      },
      {
        field: 'is_active',
        headerName: 'Activa',
        width: 100,
        type: 'boolean',
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: '',
        width: 70,
        getActions: ({ row }) => [
          <GridActionsCellItem
            key="edit"
            icon={<IconEdit size={18} />}
            label="Editar"
            onClick={() => {
              setEditRow(row)
              setEditForm({
                display_name: row.display_name,
                role: row.role,
                is_active: row.is_active,
                new_password: '',
              })
            }}
          />,
        ],
      },
    ],
    []
  )

  const submitCreate = async () => {
    setSaving(true)
    try {
      await createDashboardAccount({
        email: createForm.email.trim().toLowerCase(),
        display_name: createForm.display_name.trim(),
        password: createForm.password,
        role: createForm.role,
      })
      setCreateOpen(false)
      setCreateForm(emptyCreate)
      await load()
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'No se pudo crear la cuenta')
    } finally {
      setSaving(false)
    }
  }

  const submitEdit = async () => {
    if (!editRow) return
    setSaving(true)
    try {
      await updateDashboardAccount(editRow.id, {
        display_name: editForm.display_name.trim(),
        role: editForm.role,
        is_active: editForm.is_active,
        ...(editForm.new_password.trim().length >= 8
          ? { new_password: editForm.new_password.trim() }
          : {}),
      })
      setEditRow(null)
      await load()
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'No se pudo actualizar')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) {
    return (
      <PageContainer title="Configuración de cuentas" description="Permisos del panel">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    )
  }

  if (!allowed) {
    return (
      <PageContainer title="Configuración de cuentas" description="Permisos del panel">
        <Alert severity="warning">
          Solo el <strong>administrador general</strong> puede acceder a esta sección.
        </Alert>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="Configuración de cuentas" description="Alta de cuentas y permisos del panel">
      <Stack spacing={2}>
        {!apiReady && (
          <Alert severity="info">
            Para administrar cuentas necesita una sesión con el <strong>backend en línea</strong>. Cierre sesión
            e inicie de nuevo con la API activa (el login usará el servidor y emitirá un token). Si usa solo el
            modo sin API, esta pantalla queda deshabilitada.
          </Alert>
        )}
        {loadError && (
          <Alert severity="error" onClose={() => setLoadError('')}>
            {loadError}
          </Alert>
        )}

        <Paper sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <div>
              <Typography variant="h6" fontWeight={700}>
                Cuentas del panel
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Administrador general: asigne rol a cada usuario (administrador, editor o solo lectura).
              </Typography>
            </div>
            <Button
              variant="contained"
              startIcon={<IconPlus size={18} />}
              disabled={!apiReady || saving}
              onClick={() => {
                setCreateForm(emptyCreate)
                setCreateOpen(true)
              }}
            >
              Nueva cuenta
            </Button>
          </Box>

          <Box sx={{ width: '100%', minHeight: 400 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              sx={{ border: 'none' }}
            />
          </Box>
        </Paper>
      </Stack>

      <Dialog open={createOpen} onClose={() => !saving && setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva cuenta del panel</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Correo (login)"
              fullWidth
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              size="small"
            />
            <TextField
              label="Nombre a mostrar"
              fullWidth
              value={createForm.display_name}
              onChange={(e) => setCreateForm((f) => ({ ...f, display_name: e.target.value }))}
              size="small"
            />
            <TextField
              label="Contraseña inicial"
              type="password"
              fullWidth
              helperText="Mínimo 8 caracteres"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Rol</InputLabel>
              <Select
                label="Rol"
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, role: e.target.value as DashboardRole }))
                }
              >
                {ROLE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    <Box>
                      <Typography variant="body2">{o.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {o.hint}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={
              saving ||
              createForm.password.length < 8 ||
              !createForm.email.trim() ||
              !createForm.display_name.trim()
            }
            onClick={submitCreate}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editRow} onClose={() => !saving && setEditRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar cuenta</DialogTitle>
        <DialogContent>
          {editRow && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {editRow.email}
              </Typography>
              <TextField
                label="Nombre a mostrar"
                fullWidth
                value={editForm.display_name}
                onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
                size="small"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Rol</InputLabel>
                <Select
                  label="Rol"
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, role: e.target.value as DashboardRole }))
                  }
                >
                  {ROLE_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                }
                label="Cuenta activa"
              />
              <TextField
                label="Nueva contraseña (opcional)"
                type="password"
                fullWidth
                helperText="Dejar vacío para no cambiar. Mínimo 8 caracteres si la completa."
                value={editForm.new_password}
                onChange={(e) => setEditForm((f) => ({ ...f, new_password: e.target.value }))}
                size="small"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRow(null)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" disabled={saving} onClick={submitEdit}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  )
}
