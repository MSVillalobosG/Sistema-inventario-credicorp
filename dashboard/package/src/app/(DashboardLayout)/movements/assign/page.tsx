'use client'

import { Autocomplete } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { saveActaSalidaDraft } from '@/lib/actaSalidaDraft'
import { fetcher } from '@/services/api'
import { canWriteInventory } from '@/services/auth'
import InventoryFormPanel from '@/app/(DashboardLayout)/components/shared/InventoryFormPanel'
import InventoryInfoRow from '@/app/(DashboardLayout)/components/shared/InventoryInfoRow'
import InventoryPageShell from '@/app/(DashboardLayout)/components/shared/InventoryPageShell'

export default function AsignacionEquipo() {
  const router = useRouter()
  const canWrite = canWriteInventory()
  const [confirmAssignOpen, setConfirmAssignOpen] = useState(false)
  const [assignSubmitting, setAssignSubmitting] = useState(false)
  const sedesDisponibles = ['CALLE 72', 'CALLE 94', 'VENADOS', 'CALI', 'BARRANQUILLA']
  const [documento, setDocumento] = useState('')
  const [sedeUsuario, setSedeUsuario] = useState('')
  const [placa, setPlaca] = useState('')
  const [cedula, setCedula] = useState('')
  const [nombre, setNombre] = useState('')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [cargo, setCargo] = useState('')
  const [vpFuncional, setVpFuncional] = useState('')
  const [lider, setLider] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [email, setEmail] = useState('')
  const [device, setDevice] = useState<any>(null)
  const [usuario, setUsuario] = useState('')
  const [usuarioSistema, setUsuarioSistema] = useState('')
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any>(null)
  const [editandoUsuario, setEditandoUsuario] = useState(false)
  const [usuarioEditId, setUsuarioEditId] = useState<number | null>(null)

  const [sedeFilter, setSedeFilter] = useState('')
  const [equiposDisponibles, setEquiposDisponibles] = useState<any[]>([])
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<any | null>(null)

  useEffect(() => {
    setEquiposDisponibles([])
    setEquipoSeleccionado(null)
    setDevice(null)
    setPlaca('')
    let mounted = true
    const q = new URLSearchParams({ limit: '300' })
    if (sedeFilter) q.set('ciudad', sedeFilter)
    fetcher(`/devices/available?${q.toString()}`)
      .then((data) => {
        if (!mounted) return
        setEquiposDisponibles(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!mounted) return
        setEquiposDisponibles([])
      })
    return () => {
      mounted = false
    }
  }, [sedeFilter])

  const equiposOptions = useMemo(() => {
    return (equiposDisponibles || []).filter((d) => !d?.usuario_asignado)
  }, [equiposDisponibles])

  /** Placa efectiva para API y acta: a veces `device.placa_equipo` viene vacío en BD pero sí hay placa en el buscador o en el autocomplete. */
  const placaResuelta = useMemo(() => {
    const a = String(device?.placa_equipo || '').trim()
    const b = String(placa || '').trim()
    const c = String(equipoSeleccionado?.placa_equipo || '').trim()
    return (a || b || c).toUpperCase()
  }, [device?.placa_equipo, placa, equipoSeleccionado?.placa_equipo])

  // 🔎 Buscar equipo por PLACA (solo disponibles)
  const buscarEquipo = async () => {

    if (!placa) {
      alert('Ingrese placa del equipo')
      return
    }

    try {
      const p = placa.trim()
      if (!p) {
        alert('Ingrese placa del equipo')
        return
      }
      const q = new URLSearchParams()
      if (sedeFilter) q.set('ciudad', sedeFilter)
      const suffix = q.toString() ? `?${q.toString()}` : ''
      const data = await fetcher(`/devices/available-by-placa/${encodeURIComponent(p)}${suffix}`)
      setDevice(data)
      setEquipoSeleccionado(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Equipo no disponible o no existe'
      alert(msg)
      setDevice(null)
    }
  }

  // 🔎 Buscar usuarios existentes
  const buscarUsuarios = async (valor: string) => {

  if (!valor || valor.length < 2) {
    setUsuarios([])
    return
  }

    try {
      const data = await fetcher(`/users/search?q=${valor}`)
      setUsuarios(data)
    } catch {
      setUsuarios([])
    }
}

  const abrirConfirmacionAsignacion = () => {
    if (!device || !usuario) {
      alert('Debe buscar equipo y seleccionar un usuario a asignar.')
      return
    }
    if (!placaResuelta) {
      alert(
        'No hay placa de equipo para enviar al servidor. Escriba la placa en el campo "Placa del Equipo" o elija el equipo en el desplegable.'
      )
      return
    }
    setConfirmAssignOpen(true)
  }

  /** Ejecuta la asignación y lleva al acta de salida (formato tipo Excel en web). */
  const confirmarYAsignarEquipo = async () => {
    if (!device || !usuario || !placaResuelta) return
    setAssignSubmitting(true)
    try {
      const params = new URLSearchParams()
      params.set('placa', placaResuelta)
      params.set('usuario', String(usuario || '').trim())
      const nom = (usuarioSeleccionado?.nombre || '').trim()
      if (nom) params.set('nombre', nom)
      const url = `/devices/assign-by-placa?${params.toString()}`
      await fetcher(url, { method: 'PUT' })

      saveActaSalidaDraft({
        placa: placaResuelta,
        usuarioRed: String(usuario || '').trim(),
        nombreUsuario: nom || String(usuario || '').trim(),
        documento: usuarioSeleccionado?.documento ?? null,
        email: usuarioSeleccionado?.email ?? null,
        sedeUsuario: usuarioSeleccionado?.sede ?? null,
        cargo: usuarioSeleccionado?.cargo ?? null,
        device: {
          id: device.id,
          placa_equipo: placaResuelta,
          marca: device.marca,
          modelo: device.modelo,
          serial_number: device.serial_number,
          nombre_equipo: device.nombre_equipo,
          tipo_equipo: device.tipo_equipo,
          sistema_operativo: device.sistema_operativo,
          tipo_procesador: device.tipo_procesador,
          capacidad_ram: device.capacidad_ram,
          tipo_ram: device.tipo_ram,
          tipo_disco: device.tipo_disco,
          capacidad_disco: device.capacidad_disco,
          sede: device.sede,
          tipo_contrato: device.tipo_contrato,
          ip_consola: device.ip_consola,
        },
        asignadoEn: new Date().toISOString(),
      })

      setConfirmAssignOpen(false)
      setUsuario('')
      setUsuarioSeleccionado(null)
      setDevice(null)
      setPlaca('')
      setEquipoSeleccionado(null)
      router.push('/movements/acta-salida')
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'No se pudo completar la asignación. Intente de nuevo.'
      alert(msg)
    } finally {
      setAssignSubmitting(false)
    }
  }

  // 🔥 FUNCIÓN NUEVA (crear usuario)
  const crearUsuario = async () => {
    if (!canWrite) {
      alert('Su cuenta solo tiene permiso de visualización.')
      return
    }

    if (!nombre || !email || !documento || !usuarioSistema) {
      alert("Nombre, email y documento son obligatorios")
      return
    }

    try {
      await fetcher("/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre,
          email,
          documento,
          usuario: usuarioSistema,
          cargo,
          sede: sedeUsuario
        })
      })

      alert("Usuario creado correctamente")

      setNombre('')
      setEmail('')
      setDocumento('')
      setCargo('')
      setSedeUsuario('')
      setUsuarioSistema('')
    } catch (e: any) {
      alert(e?.message || "Error al crear usuario")
    }
  }

  // 🔥 FUNCIÓN NUEVA (actualizar usuario)
const actualizarUsuario = async () => {
  if (!canWrite) {
    alert('Su cuenta solo tiene permiso de visualización.')
    return
  }

  if (!usuarioEditId) return

  try {
    await fetcher(`/users/${usuarioEditId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nombre,
        email,
        documento,
        usuario: usuarioSistema,
        cargo,
        sede: sedeUsuario
      })
    })

    alert("Usuario actualizado correctamente")

    setEditandoUsuario(false)
    setUsuarioEditId(null)

    setNombre('')
    setEmail('')
    setDocumento('')
    setCargo('')
    setSedeUsuario('')
    setUsuarioSistema('')

  } catch (e: any) {
    alert(e?.message || "Error al actualizar usuario")
  }

}

const limpiarFormularioUsuario = () => {
  setEditandoUsuario(false)
  setUsuarioEditId(null)
  setNombre('')
  setEmail('')
  setUsuarioSistema('')
  setDocumento('')
  setCargo('')
  setSedeUsuario('')
}

  return (
    <InventoryPageShell
      title="Asignación de equipo"
      description="Busque un equipo disponible por placa y asígnelo a un usuario de red."
    >

      {!canWrite && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Solo visualización: no puede asignar equipos ni crear o editar usuarios de inventario.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '0.7fr 1fr' },
          gap: 2,
          mb: 3
        }}
      >

        {/* ================= COLUMNA IZQUIERDA ================= */}
        <InventoryFormPanel>

          {/* ================= FILTROS (MISMA LÓGICA QUE Dispositivos) ================= */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              size="small"
              variant={sedeFilter === '' ? 'contained' : 'outlined'}
              onClick={() => setSedeFilter('')}
            >
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
              variant="contained"
              color="primary"
              disabled
              sx={{ ml: 0 }}
            >
              Equipos sin asignar
            </Button>
          </Box>

          <Autocomplete
            options={equiposOptions}
            value={equipoSeleccionado}
            getOptionLabel={(option) => {
              const p = (option?.placa_equipo || '').trim()
              const marca = (option?.marca || '').trim()
              const modelo = (option?.modelo || '').trim()
              const sedeEquipo = (option?.sede || '').trim()
              const chunks = [p || `#${option?.id ?? ''}`, marca && modelo ? `${marca} ${modelo}` : marca || modelo, sedeEquipo]
                .filter(Boolean)
                .join(' · ')
              return chunks || ''
            }}
            isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
            onChange={(_, value) => {
              setEquipoSeleccionado(value || null)
              const p = (value?.placa_equipo || '').trim()
              if (p) setPlaca(p.toUpperCase())
              if (value) setDevice(value)
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={
                  sedeFilter
                    ? `Equipo sin asignar (${sedeFilter})`
                    : 'Equipos sin asignar (todas las ciudades)'
                }
                fullWidth
                sx={{ mb: 2 }}
              />
            )}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="Placa del Equipo"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              fullWidth
            />

            <Button variant="contained" onClick={buscarEquipo}>
              Buscar
            </Button>
          </Box>

          {device && (
            <>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Información del Equipo
              </Typography>

              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                {[
                  { label: 'ID', value: device.id },
                  { label: 'Placa', value: device.placa_equipo },
                  { label: 'Marca', value: device.marca },
                  { label: 'Modelo', value: device.modelo },
                  { label: 'Sistema Operativo', value: device.sistema_operativo },
                  { label: 'Procesador', value: device.tipo_procesador },
                  { label: 'RAM Instalada', value: `${device.capacidad_ram} GB` },
                  { label: 'Tipo RAM', value: device.tipo_ram },
                  { label: 'Tipo Disco', value: device.tipo_disco },
                  { label: 'Capacidad Disco', value: `${device.capacidad_disco} GB` },
                  { label: 'Usuario Asignado', value: device.usuario_asignado || 'Sin asignar' }
                ].map((item, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                    <InventoryInfoRow label={item.label} value={item.value} />
                  </Grid>
                ))}
              </Grid>

              <Autocomplete
  options={usuarios}
  getOptionLabel={(option) => option.usuario || ""}
  filterOptions={(x) => x}
  onInputChange={(event, value) => buscarUsuarios(value)}
  onChange={(event, value) => {

    if (value) {
      setUsuario(value.usuario)
      setUsuarioSeleccionado(value)
    } else {
      setUsuario("")
      setUsuarioSeleccionado(null)
    }

  }}
  renderInput={(params) => (
    <TextField {...params} label="Usuario a asignar" fullWidth sx={{ mb: 2 }} />
  )}
/>


{usuarioSeleccionado && (

  <Box
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      p: 2,
      mb: 2,
      bgcolor: (t) => t.palette.action.hover,
    }}
  >

    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
      Información del Usuario
    </Typography>

    <Typography variant="body2">
      <b>Nombre:</b> {usuarioSeleccionado.nombre}
    </Typography>

    <Typography variant="body2">
      <b>Usuario:</b> {usuarioSeleccionado.usuario}
    </Typography>

    <Typography variant="body2">
      <b>Documento:</b> {usuarioSeleccionado.documento}
    </Typography>

    <Typography variant="body2">
      <b>Email:</b> {usuarioSeleccionado.email}
    </Typography>

    <Typography variant="body2">
      <b>Cargo:</b> {usuarioSeleccionado?.cargo ?? '—'}
    </Typography>

    <Typography variant="body2">
      <b>Sede:</b> {usuarioSeleccionado?.sede ?? '—'}
    </Typography>

  </Box>

)}


{usuarioSeleccionado && (
  <>
    <Button
      variant="contained"
      onClick={abrirConfirmacionAsignacion}
      fullWidth
      disabled={!canWrite}
    >
      Asignar Equipo
    </Button>

    <Button
      variant="contained"
      color="secondary"
      sx={{ mt: 2 }}
      disabled={!canWrite}
      onClick={() => {
        setEditandoUsuario(true)
        setUsuarioEditId(usuarioSeleccionado?.id ?? null)
        setNombre(usuarioSeleccionado?.nombre ?? '')
        setEmail(usuarioSeleccionado?.email ?? '')
        setUsuarioSistema(usuarioSeleccionado?.usuario ?? '')
        setDocumento(usuarioSeleccionado?.documento ?? '')
        setCargo(usuarioSeleccionado?.cargo ?? '')
        setSedeUsuario(usuarioSeleccionado?.sede ?? '')
      }}
    >
      Editar Usuario
    </Button>
  </>
)}
            </>
          )}

        </InventoryFormPanel>

        {/* ================= COLUMNA DERECHA ================= */}
        <InventoryFormPanel sx={{ minHeight: { lg: 400 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="h6">
              {editandoUsuario ? 'Editar Usuario' : 'Crear Usuario'}
            </Typography>
            <Button size="small" variant="outlined" onClick={limpiarFormularioUsuario}>
              {editandoUsuario ? 'Cancelar edicion' : 'Limpiar'}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Crea o actualiza usuarios de inventario. Si seleccionas un usuario en la izquierda y pulsas
            "Editar Usuario", este formulario se llena automaticamente.
          </Typography>

          <TextField
            label="Nombre Completo *"
            fullWidth
            sx={{ mb: 2 }}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <TextField
            label="Email *"
            fullWidth
            sx={{ mb: 2 }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Usuario de Red *"
            fullWidth
            sx={{ mb: 2 }}
            value={usuarioSistema}
            onChange={(e) => setUsuarioSistema(e.target.value)}
          />
          <TextField
            label="Documento *"
            fullWidth
            sx={{ mb: 2 }}
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
          />
          <TextField
            label="Cargo"
            fullWidth
            sx={{ mb: 2 }}
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
          />
          <TextField
            label="Sede"
            fullWidth
            sx={{ mb: 2 }}
            value={sedeUsuario}
            onChange={(e) => setSedeUsuario(e.target.value)}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Campos con * son obligatorios.
          </Typography>

          <Button
            variant="contained"
            fullWidth
            disabled={!canWrite}
            onClick={editandoUsuario ? actualizarUsuario : crearUsuario}
          >
            {editandoUsuario ? 'Guardar Cambios' : 'Crear Usuario'}
          </Button>
        </InventoryFormPanel>

      </Box>

      <Dialog
        open={confirmAssignOpen}
        onClose={() => !assignSubmitting && setConfirmAssignOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar asignación</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Se asignará el equipo indicado a continuación al usuario seleccionado. Revise los datos y confirme si está de acuerdo.
          </Typography>
          <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
            Equipo
          </Typography>
          <List dense disablePadding sx={{ mb: 2 }}>
            <ListItem disablePadding sx={{ py: 0.25 }}>
              <ListItemText primary="Placa" secondary={placaResuelta || '—'} />
            </ListItem>
            <ListItem disablePadding sx={{ py: 0.25 }}>
              <ListItemText
                primary="Marca / Modelo"
                secondary={`${device?.marca || '—'} · ${device?.modelo || '—'}`}
              />
            </ListItem>
            <ListItem disablePadding sx={{ py: 0.25 }}>
              <ListItemText primary="Sede del equipo" secondary={device?.sede || '—'} />
            </ListItem>
            <ListItem disablePadding sx={{ py: 0.25 }}>
              <ListItemText primary="Serial" secondary={device?.serial_number || '—'} />
            </ListItem>
          </List>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
            Usuario de red
          </Typography>
          <List dense disablePadding>
            <ListItem disablePadding sx={{ py: 0.25 }}>
              <ListItemText primary="Usuario" secondary={usuario || '—'} />
            </ListItem>
            <ListItem disablePadding sx={{ py: 0.25 }}>
              <ListItemText primary="Nombre" secondary={usuarioSeleccionado?.nombre || '—'} />
            </ListItem>
            <ListItem disablePadding sx={{ py: 0.25 }}>
              <ListItemText primary="Documento" secondary={usuarioSeleccionado?.documento || '—'} />
            </ListItem>
            <ListItem disablePadding sx={{ py: 0.25 }}>
              <ListItemText primary="Correo" secondary={usuarioSeleccionado?.email || '—'} />
            </ListItem>
          </List>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Al confirmar, el equipo quedará asignado en inventario y se abrirá el formulario del acta de salida para completar e imprimir.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmAssignOpen(false)} disabled={assignSubmitting}>
            No, cancelar
          </Button>
          <Button variant="contained" onClick={confirmarYAsignarEquipo} disabled={assignSubmitting}>
            {assignSubmitting ? 'Asignando…' : 'Sí, estoy de acuerdo'}
          </Button>
        </DialogActions>
      </Dialog>
    </InventoryPageShell>
  )
}