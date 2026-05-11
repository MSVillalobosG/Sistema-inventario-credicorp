'use client'

import { useState } from 'react'
import { Box, Button, TextField, Grid, Alert } from '@mui/material'
import { getApiBase, getAuthHeaders } from '@/services/api'
import { useRouter } from 'next/navigation'
import { canWriteInventory } from '@/services/auth'
import InventoryFormPanel from '@/app/(DashboardLayout)/components/shared/InventoryFormPanel'
import InventoryPageShell from '@/app/(DashboardLayout)/components/shared/InventoryPageShell'

export default function NuevaPlantilla() {

  const router = useRouter()
  const canWrite = canWriteInventory()

  const [form, setForm] = useState<any>({})
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const handleChange = (campo: string, valor: any) => {
    setForm({ ...form, [campo]: valor })
  }

  const guardarPlantilla = async () => {
    if (!canWrite) {
      setError('Su cuenta solo tiene permiso de visualización.')
      return
    }

    setMensaje('')
    setError('')

    if (!form.nombre_modelo || !form.marca || !form.modelo) {
      setError("Nombre modelo, marca y modelo son obligatorios")
      return
    }

    const response = await fetch(
      `${getApiBase()}/templates/`,
      {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(form)
      }
    )

    if (response.ok) {
      setMensaje("Plantilla creada correctamente")
      setForm({})
    } else {
      setError("Error creando plantilla")
    }
  }

  return (
    <InventoryPageShell
      title="Nueva plantilla de modelo"
      description="Defina los datos técnicos del modelo para reutilizarlos al crear lotes."
    >

      {!canWrite && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Solo visualización: no puede crear plantillas.
        </Alert>
      )}

      <InventoryFormPanel>

        <Grid container spacing={3}>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Nombre Modelo Comercial"
              value={form.nombre_modelo || ""}
              onChange={(e) => handleChange("nombre_modelo", e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Marca"
              value={form.marca || ""}
              onChange={(e) => handleChange("marca", e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Modelo Técnico"
              value={form.modelo || ""}
              onChange={(e) => handleChange("modelo", e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Sistema Operativo"
              value={form.sistema_operativo || ""}
              onChange={(e) => handleChange("sistema_operativo", e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Procesador"
              value={form.tipo_procesador || ""}
              onChange={(e) => handleChange("tipo_procesador", e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              type="number"
              fullWidth
              label="RAM (GB)"
              value={form.capacidad_ram || ""}
              onChange={(e) => handleChange("capacidad_ram", Number(e.target.value))}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Tipo RAM"
              value={form.tipo_ram || ""}
              onChange={(e) => handleChange("tipo_ram", e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Tipo Disco"
              value={form.tipo_disco || ""}
              onChange={(e) => handleChange("tipo_disco", e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              type="number"
              fullWidth
              label="Capacidad Disco (GB)"
              value={form.capacidad_disco || ""}
              onChange={(e) => handleChange("capacidad_disco", Number(e.target.value))}
            />
          </Grid>

        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5, gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => router.push('/nuevo/dispositivo')}
          >
            Volver
          </Button>

          <Button
            variant="contained"
            onClick={guardarPlantilla}
            disabled={!canWrite}
          >
            Guardar Plantilla
          </Button>
        </Box>

        {mensaje && <Alert severity="success" sx={{ mt: 3, borderRadius: 2 }}>{mensaje}</Alert>}
        {error && <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>{error}</Alert>}

      </InventoryFormPanel>

    </InventoryPageShell>
  )
}