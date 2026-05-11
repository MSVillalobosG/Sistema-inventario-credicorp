'use client'

// "use client" indica que este componente se ejecuta en el navegador.
// Es necesario porque usamos:
// - useState (estado de React)
// - eventos como onClick

import { Alert, Box, Typography, TextField, Button, Grid } from "@mui/material"
import InventoryFormPanel from '@/app/(DashboardLayout)/components/shared/InventoryFormPanel'
import InventoryInfoRow from '@/app/(DashboardLayout)/components/shared/InventoryInfoRow'
import InventoryPageShell from '@/app/(DashboardLayout)/components/shared/InventoryPageShell'
import { fetcher } from '@/services/api'
import { canWriteInventory } from '@/services/auth'
import { Autocomplete } from '@mui/material'
// Componentes de Material UI para construir la interfaz

import { useEffect, useMemo, useState } from "react"
// Hook de React para manejar estados dinámicos

import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material"

export default function CambioEquipo(){

const canWrite = canWriteInventory()

/* =====================================================
1️⃣ ESTADOS
Los estados guardan información que cambia en la pantalla
===================================================== */

const [placaViejo,setPlacaViejo]=useState("")
const [equipoViejo,setEquipoViejo]=useState<any>(null)

const [placaNuevo,setPlacaNuevo]=useState("")
const [equipoNuevo,setEquipoNuevo]=useState<any>(null)
const [sedeFilter, setSedeFilter] = useState('')
const [equiposDisponibles, setEquiposDisponibles] = useState<any[]>([])
const [equipoNuevoSeleccionado, setEquipoNuevoSeleccionado] = useState<any | null>(null)
const sedesDisponibles = ['CALLE 72', 'CALLE 94', 'VENADOS', 'CALI', 'BARRANQUILLA']

const [openConfirmacion,setOpenConfirmacion]=useState(false)

useEffect(() => {
  let mounted = true
  const q = new URLSearchParams({ limit: '300' })
  if (sedeFilter) q.set('ciudad', sedeFilter)

  fetcher(`/devices/available?${q.toString()}`)
    .then((data) => {
      if (!mounted) return
      const rows = Array.isArray(data) ? data : []
      setEquiposDisponibles(rows)
    })
    .catch(() => {
      if (!mounted) return
      setEquiposDisponibles([])
    })

  return () => {
    mounted = false
  }
}, [sedeFilter])

const equiposNuevosOptions = useMemo(() => {
  return (equiposDisponibles || []).filter((d) => !d?.usuario_asignado)
}, [equiposDisponibles])


/* =====================================================
2️⃣ FUNCIONES
===================================================== */

const buscarEquipoViejo = async ()=>{
  const p = placaViejo.trim()
  if (!p) {
    alert("Ingrese la placa del equipo actual")
    return
  }
  try {
    const data = await fetcher(`/devices/assigned-by-placa/${encodeURIComponent(p)}`)
    setEquipoViejo(data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Equipo no encontrado"
    alert(msg)
  }
}


const buscarEquipoNuevo = async ()=>{
  const p = placaNuevo.trim()
  if (!p) {
    alert("Ingrese la placa del equipo nuevo")
    return
  }
  try {
    const data = await fetcher(`/devices/available-by-placa/${encodeURIComponent(p)}`)
    setEquipoNuevo(data)
    setEquipoNuevoSeleccionado(null)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Equipo no disponible"
    alert(msg)
  }
}


/* =====================================================
Funcion cambio de equipo
===================================================== */

const ejecutarCambio = async ()=>{
  if (!canWrite) {
    alert("Su cuenta solo tiene permiso de visualización.")
    return
  }
  if(equipoViejo.id === equipoNuevo.id){
    alert("No puede cambiar un equipo por sí mismo")
    return
  }

  try {
    await fetcher(`/devices/change?old_device_id=${equipoViejo.id}&new_device_id=${equipoNuevo.id}`, {
      method: "PUT"
    })

    alert("Cambio realizado correctamente")
    setOpenConfirmacion(false)
    setEquipoViejo(null)
    setEquipoNuevo(null)
    setPlacaViejo("")
    setPlacaNuevo("")
  } catch (e: any) {
    alert(e?.message || "Error realizando el cambio")
  }
}


/* =====================================================
3️⃣ RETURN
===================================================== */

return(

<InventoryPageShell
  title="Cambio de equipo"
  description="Busque el equipo asignado al usuario y el equipo nuevo disponible para registrar el reemplazo."
>

{!canWrite && (
  <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
    Solo visualización: no puede ejecutar cambios de equipo.
  </Alert>
)}

<Box
sx={{
display:"grid",
gridTemplateColumns:{ xs: '1fr', lg: '1fr 1fr' },
gap:3
}}
>


{/* =====================================================
COLUMNA IZQUIERDA
===================================================== */}

<InventoryFormPanel>

<Typography variant="h6" sx={{mb:2}}>
Equipo Actual
</Typography>

<TextField
label="Placa equipo actual"
fullWidth
value={placaViejo}
onChange={(e)=>setPlacaViejo(e.target.value)}
/>

<Button
variant="contained"
sx={{mt:2}}
onClick={buscarEquipoViejo}
>
Buscar
</Button>


{equipoViejo && (

<>
<Typography variant="h6" sx={{ mt:3, mb:2, fontWeight:600 }}>
Información del Equipo
</Typography>

<Grid container spacing={1.5} sx={{ mb: 2 }}>

{[
{ label:'ID', value: equipoViejo.id },
{ label:'Placa', value: equipoViejo.placa_equipo },
{ label:'Marca', value: equipoViejo.marca },
{ label:'Modelo', value: equipoViejo.modelo },
{ label:'Sistema Operativo', value: equipoViejo.sistema_operativo },
{ label:'Procesador', value: equipoViejo.tipo_procesador },
{ label:'RAM Instalada', value: `${equipoViejo.capacidad_ram} GB` },
{ label:'Tipo RAM', value: equipoViejo.tipo_ram },
{ label:'Tipo Disco', value: equipoViejo.tipo_disco },
{ label:'Capacidad Disco', value: `${equipoViejo.capacidad_disco} GB` },
{ label:'Usuario Asignado', value: equipoViejo.usuario_asignado }
].map((item,index)=>(
<Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
<InventoryInfoRow label={item.label} value={item.value} />
</Grid>
))}

</Grid>
</>

)}

</InventoryFormPanel>


{/* =====================================================
COLUMNA DERECHA
===================================================== */}

<InventoryFormPanel>

<Typography variant="h6" sx={{mb:2}}>
Equipo Nuevo
</Typography>

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
  <Button size="small" variant="contained" color="primary" disabled>
    Equipos sin asignar
  </Button>
</Box>

<Autocomplete
  options={equiposNuevosOptions}
  value={equipoNuevoSeleccionado}
  getOptionLabel={(option) => {
    const p = (option?.placa_equipo || '').trim()
    const marca = (option?.marca || '').trim()
    const modelo = (option?.modelo || '').trim()
    const sedeEquipo = (option?.sede || '').trim()
    return [p || `#${option?.id ?? ''}`, marca && modelo ? `${marca} ${modelo}` : marca || modelo, sedeEquipo]
      .filter(Boolean)
      .join(' · ')
  }}
  isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
  onChange={(_, value) => {
    setEquipoNuevoSeleccionado(value || null)
    const p = (value?.placa_equipo || '').trim()
    if (p) setPlacaNuevo(p.toUpperCase())
    if (value) setEquipoNuevo(value)
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

<TextField
label="Placa equipo nuevo"
fullWidth
value={placaNuevo}
onChange={(e)=>setPlacaNuevo(e.target.value.toUpperCase())}
/>

<Button
variant="contained"
sx={{mt:2}}
onClick={buscarEquipoNuevo}
>
Buscar
</Button>


{equipoNuevo && (

<>
<Typography variant="h6" sx={{ mt:3, mb:2, fontWeight:600 }}>
Información del Equipo Nuevo
</Typography>

<Grid container spacing={1.5} sx={{ mb: 2 }}>

{[
{ label:'ID', value: equipoNuevo.id },
{ label:'Placa', value: equipoNuevo.placa_equipo },
{ label:'Marca', value: equipoNuevo.marca },
{ label:'Modelo', value: equipoNuevo.modelo },
{ label:'Sistema Operativo', value: equipoNuevo.sistema_operativo },
{ label:'Procesador', value: equipoNuevo.tipo_procesador },
{ label:'RAM Instalada', value: `${equipoNuevo.capacidad_ram} GB` },
{ label:'Tipo RAM', value: equipoNuevo.tipo_ram },
{ label:'Tipo Disco', value: equipoNuevo.tipo_disco },
{ label:'Capacidad Disco', value: `${equipoNuevo.capacidad_disco} GB` },
{ label:'Estado', value: equipoNuevo.estado }
].map((item,index)=>(
<Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
<InventoryInfoRow label={item.label} value={item.value} />
</Grid>
))}

</Grid>
</>

)}

</InventoryFormPanel>

</Box>


{/* =====================================================
BOTÓN CAMBIAR EQUIPO
===================================================== */}

{equipoViejo && equipoNuevo && (

<Button
variant="contained"
color="secondary"
sx={{mt:4}}
fullWidth
disabled={!canWrite}
onClick={()=>setOpenConfirmacion(true)}
>

Cambiar Equipo

</Button>

)}


<Dialog
open={openConfirmacion}
onClose={()=>setOpenConfirmacion(false)}
maxWidth="sm"
fullWidth
>

<DialogTitle>
Confirmación de Cambio de Equipo
</DialogTitle>

<DialogContent>

<Typography variant="subtitle1" sx={{mt:1, fontWeight:600}}>
Equipo Actual
</Typography>

<Typography>Placa: {equipoViejo?.placa_equipo}</Typography>
<Typography>Marca: {equipoViejo?.marca}</Typography>
<Typography>Modelo: {equipoViejo?.modelo}</Typography>
<Typography>Sistema Operativo: {equipoViejo?.sistema_operativo}</Typography>
<Typography>Procesador: {equipoViejo?.tipo_procesador}</Typography>
<Typography>RAM Instalada: {equipoViejo?.capacidad_ram} GB</Typography>
<Typography>Tipo Disco: {equipoViejo?.tipo_disco}</Typography>
<Typography>Capacidad Disco: {equipoViejo?.capacidad_disco} GB</Typography>


<Typography variant="subtitle1" sx={{mt:3, fontWeight:600}}>
Equipo Nuevo
</Typography>

<Typography>Placa: {equipoNuevo?.placa_equipo}</Typography>
<Typography>Marca: {equipoNuevo?.marca}</Typography>
<Typography>Modelo: {equipoNuevo?.modelo}</Typography>
<Typography>Sistema Operativo: {equipoNuevo?.sistema_operativo}</Typography>
<Typography>Procesador: {equipoNuevo?.tipo_procesador}</Typography>
<Typography>RAM Instalada: {equipoNuevo?.capacidad_ram} GB</Typography>
<Typography>Tipo Disco: {equipoNuevo?.tipo_disco}</Typography>
<Typography>Capacidad Disco: {equipoNuevo?.capacidad_disco} GB</Typography>


<Typography sx={{mt:3, fontWeight:600}}>
Usuario asignado: {equipoViejo?.usuario_asignado}
</Typography>

</DialogContent>


<DialogActions>

<Button
onClick={()=>setOpenConfirmacion(false)}
>
Cancelar
</Button>

<Button
variant="contained"
color="primary"
disabled={!canWrite}
onClick={ejecutarCambio}
>
Confirmar Cambio
</Button>

</DialogActions>

</Dialog>

</InventoryPageShell>

)

}