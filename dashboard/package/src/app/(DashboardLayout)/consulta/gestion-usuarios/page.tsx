'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { IconSearch, IconUserPlus, IconUsers, IconPencil } from '@tabler/icons-react'
import { canWriteInventory } from '@/services/auth'
import { fetcher } from '@/services/api'
import InventoryFormPanel from '@/app/(DashboardLayout)/components/shared/InventoryFormPanel'
import InventoryPageShell from '@/app/(DashboardLayout)/components/shared/InventoryPageShell'

type UserResponse = {
  id: number
  nombre: string
  email: string
  documento: string
  usuario: string
  cargo?: string | null
  sede?: string | null
}

export default function GestionUsuariosPage() {
  const theme = useTheme()
  const canWrite = canWriteInventory()

  const [tab, setTab] = useState(0) // 0 = Usuarios creados, 1 = Crear/Editar

  const [usersList, setUsersList] = useState<UserResponse[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  const [editandoUsuario, setEditandoUsuario] = useState(false)
  const [usuarioEditId, setUsuarioEditId] = useState<number | null>(null)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [usuarioSistema, setUsuarioSistema] = useState('')
  const [documento, setDocumento] = useState('')
  const [cargo, setCargo] = useState('')
  const [sedeUsuario, setSedeUsuario] = useState('')

  const cargarUsuarios = useCallback(async () => {
    setUsersLoading(true)
    try {
      const data = await fetcher('/users/')
      setUsersList(Array.isArray(data) ? data : [])
    } catch {
      setUsersList([])
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 0) cargarUsuarios()
  }, [tab, cargarUsuarios])

  const limpiarFormulario = () => {
    setEditandoUsuario(false)
    setUsuarioEditId(null)
    setNombre('')
    setEmail('')
    setUsuarioSistema('')
    setDocumento('')
    setCargo('')
    setSedeUsuario('')
  }

  const editarDesdeFila = (u: UserResponse) => {
    setTab(1)
    setEditandoUsuario(true)
    setUsuarioEditId(u.id)
    setNombre(u.nombre || '')
    setEmail(u.email || '')
    setDocumento(u.documento || '')
    setUsuarioSistema(u.usuario || '')
    setCargo(u.cargo || '')
    setSedeUsuario(u.sede || '')
  }

  const crearUsuario = async () => {
    if (!canWrite) {
      alert('Su cuenta solo tiene permiso de visualización.')
      return
    }
    if (!nombre || !email || !documento || !usuarioSistema) {
      alert('Completa nombre, email, documento y usuario de red.')
      return
    }

    try {
      await fetcher('/users/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          email,
          documento,
          usuario: usuarioSistema,
          cargo: cargo || null,
          sede: sedeUsuario || null,
        }),
      })

      alert('Usuario creado correctamente')
      await cargarUsuarios()
      limpiarFormulario()
      setTab(0)
    } catch (e: any) {
      alert(e?.message || 'Error al crear usuario')
    }
  }

  const actualizarUsuario = async () => {
    if (!canWrite) {
      alert('Su cuenta solo tiene permiso de visualización.')
      return
    }
    if (!usuarioEditId) return

    try {
      await fetcher(`/users/${usuarioEditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          email,
          documento,
          usuario: usuarioSistema,
          cargo: cargo || null,
          sede: sedeUsuario || null,
        }),
      })

      alert('Usuario actualizado correctamente')
      await cargarUsuarios()
      limpiarFormulario()
      setTab(0)
    } catch (e: any) {
      alert(e?.message || 'Error al actualizar usuario')
    }
  }

  const columns: GridColDef<UserResponse>[] = useMemo(
    () => [
      { field: 'usuario', headerName: 'Usuario de red', minWidth: 130, flex: 1 },
      { field: 'nombre', headerName: 'Nombre completo', minWidth: 180, flex: 1.2 },
      { field: 'email', headerName: 'Correo', minWidth: 210, flex: 1.3 },
      { field: 'documento', headerName: 'Documento', minWidth: 110, flex: 0.7 },
      {
        field: 'cargo',
        headerName: 'Cargo',
        minWidth: 140,
        flex: 0.9,
        renderCell: (params) => params.row?.cargo || '—',
      },
      {
        field: 'sede',
        headerName: 'Sede',
        minWidth: 140,
        flex: 0.7,
        renderCell: (params) => params.row?.sede || '—',
      },
      {
        field: 'actions',
        headerName: '',
        minWidth: 108,
        maxWidth: 108,
        sortable: false,
        filterable: false,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Button
            size="small"
            variant="outlined"
            disabled={!canWrite}
            startIcon={<IconPencil size={14} />}
            onClick={() => editarDesdeFila(params.row)}
            sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            Editar
          </Button>
        ),
      },
    ],
    [canWrite]
  )

  const usersFiltered = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return usersList
    return usersList.filter((u) => {
      return (
        (u.nombre || '').toLowerCase().includes(q) ||
        (u.usuario || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.documento || '').toLowerCase().includes(q) ||
        (u.sede || '').toLowerCase().includes(q)
      )
    })
  }, [usersList, userSearch])

  const softBannerSx = {
    p: 2,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: alpha(theme.palette.primary.main, 0.04),
  }

  return (
    <InventoryPageShell
      title="Gestión de usuarios"
      description="Aquí ves el listado de personas registradas para inventario. Puedes buscar, crear nuevas o editar las existentes."
    >
      {!canWrite && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Tu cuenta es de solo lectura: puedes consultar la lista, pero no crear ni editar usuarios.
        </Alert>
      )}

      <InventoryFormPanel sx={{ mt: 2 }}>
        <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={2} sx={{ mb: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                minHeight: 44,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
              },
            }}
          >
            <Tab icon={<IconUsers size={18} />} iconPosition="start" label="Usuarios creados" />
            <Tab icon={<IconUserPlus size={18} />} iconPosition="start" label="Crear o editar" />
          </Tabs>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip size="small" variant="outlined" color="primary" label={`${usersList.length} en total`} />
            {editandoUsuario && tab === 1 && (
              <Chip size="small" color="warning" variant="outlined" label="Editando un usuario" />
            )}
          </Stack>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {tab === 1 ? (
          <Stack spacing={2}>
            <Box sx={softBannerSx}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {editandoUsuario ? 'Estás editando un usuario' : 'Registrar un usuario nuevo'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {editandoUsuario
                  ? 'Revisa los datos y guarda los cambios. Si prefieres empezar de cero, usa «Cancelar edición».'
                  : 'Los datos que guardes aquí sirven para asignar equipos y mantener el maestro de usuarios al día.'}
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                {editandoUsuario ? 'Formulario de edición' : 'Formulario de alta'}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" size="small" onClick={() => setTab(0)} startIcon={<IconUsers size={16} />}>
                  Volver al listado
                </Button>
                {editandoUsuario ? (
                  <Button size="small" variant="text" color="inherit" onClick={limpiarFormulario}>
                    Cancelar edición
                  </Button>
                ) : null}
              </Stack>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
              }}
            >
              <TextField
                label="Nombre completo"
                required
                fullWidth
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej.: María García López"
                helperText="Nombre como aparece en el maestro de personas"
              />
              <TextField
                label="Usuario de red"
                required
                fullWidth
                value={usuarioSistema}
                onChange={(e) => setUsuarioSistema(e.target.value)}
                placeholder="Ej.: mgarcia"
                helperText="Login de Windows / red corporativa"
              />
              <TextField
                label="Correo electrónico"
                required
                fullWidth
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria.garcia@empresa.com"
              />
              <TextField
                label="Documento de identidad"
                required
                fullWidth
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Número sin puntos, si aplica"
              />
              <TextField
                label="Cargo"
                fullWidth
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ej.: Analista de riesgos"
                helperText="Opcional"
              />
              <TextField
                label="Sede"
                fullWidth
                value={sedeUsuario}
                onChange={(e) => setSedeUsuario(e.target.value)}
                placeholder="Ej.: Calle 94"
                helperText="Opcional"
              />
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                disabled={!canWrite}
                onClick={editandoUsuario ? actualizarUsuario : crearUsuario}
                sx={{ minWidth: 220, textTransform: 'none', fontWeight: 600 }}
              >
                {editandoUsuario ? 'Guardar cambios' : 'Crear usuario'}
              </Button>
              <Button variant="outlined" size="large" onClick={() => setTab(0)} sx={{ textTransform: 'none' }}>
                Solo quiero ver el listado
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Box sx={softBannerSx}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      mt: 0.25,
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconUsers size={22} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Listado de usuarios
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Escribe en el buscador para filtrar al instante. Usa «Actualizar» si acabas de crear alguien en otra pestaña.
                    </Typography>
                  </Box>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: 1, sm: 'auto' } }}>
                  <Button
                    variant="contained"
                    fullWidth={false}
                    startIcon={<IconUserPlus size={18} />}
                    onClick={() => {
                      limpiarFormulario()
                      setTab(1)
                    }}
                    disabled={!canWrite}
                    sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    Nuevo usuario
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={cargarUsuarios}
                    disabled={usersLoading}
                    sx={{ textTransform: 'none' }}
                  >
                    {usersLoading ? 'Cargando…' : 'Actualizar lista'}
                  </Button>
                </Stack>
              </Stack>
            </Box>

            <TextField
              label="Buscar en la tabla"
              placeholder="Nombre, usuario, correo, documento o sede…"
              fullWidth
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={18} color={theme.palette.text.secondary} />
                  </InputAdornment>
                ),
              }}
              helperText={
                userSearch.trim()
                  ? `Mostrando ${usersFiltered.length} de ${usersList.length}`
                  : 'Sin filtro: se muestran todos los usuarios'
              }
            />

            {usersLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 2 }}>
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary">
                  Cargando usuarios…
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  height: { xs: 360, md: 440 },
                  width: '100%',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                <DataGrid
                  rows={usersFiltered}
                  columns={columns}
                  disableRowSelectionOnClick
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                  density="comfortable"
                  localeText={{
                    noRowsLabel: 'No hay filas que coincidan. Prueba otra palabra en el buscador.',
                  }}
                  sx={{
                    border: 0,
                    '& .MuiDataGrid-columnHeaders': {
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                      fontWeight: 700,
                    },
                    '& .MuiDataGrid-cell': { alignItems: 'center', display: 'flex' },
                  }}
                />
              </Box>
            )}

            {!usersLoading && usersList.length === 0 ? (
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  textAlign: 'center',
                  border: '1px dashed',
                  borderColor: 'divider',
                  bgcolor: alpha(theme.palette.grey[500], 0.04),
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Aún no hay usuarios registrados
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 420, mx: 'auto' }}>
                  Cuando crees el primero desde «Crear o editar», aparecerá aquí automáticamente.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<IconUserPlus size={18} />}
                  onClick={() => setTab(1)}
                  disabled={!canWrite}
                  sx={{ textTransform: 'none' }}
                >
                  Crear el primer usuario
                </Button>
              </Box>
            ) : null}

            {!usersLoading && usersList.length > 0 && usersFiltered.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No hay coincidencias con «{userSearch.trim()}». Prueba con otra palabra o borra el buscador.
              </Alert>
            ) : null}
          </Stack>
        )}
      </InventoryFormPanel>
    </InventoryPageShell>
  )
}
