'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Typography,
  TextField,
  Grid,
  Alert,
  MenuItem
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { getApiBase, getAuthHeaders } from '@/services/api'
import { canWriteInventory } from '@/services/auth'
import InventoryFormPanel from '@/app/(DashboardLayout)/components/shared/InventoryFormPanel'
import InventoryPageShell from '@/app/(DashboardLayout)/components/shared/InventoryPageShell'

export default function NuevoDispositivo() {

  const router = useRouter()
  const canWrite = canWriteInventory()

  const [templates, setTemplates] = useState<any[]>([])
  const [templateId, setTemplateId] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [orden, setOrden] = useState('')
  const [pedido, setPedido] = useState('')
  const [contrato, setContrato] = useState('')
  const [fecha, setFecha] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [sede, setSede] = useState('')
  const [codigosTexto, setCodigosTexto] = useState('')
  const [resultado, setResultado] = useState<any>(null)

  useEffect(() => {
    fetch(`${getApiBase()}/templates/`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTemplates(data)
        }
      })
  }, [])

  const crearLote = async () => {
    if (!canWrite) {
      alert('Su cuenta solo tiene permiso de visualización.')
      return
    }

    const codigosArray = codigosTexto
      .split('\n')
      .map(p => p.trim())
      .filter(p => p !== '')

    if (!templateId || codigosArray.length === 0) {
      alert("Debe seleccionar plantilla y pegar códigos")
      return
    }

    const response = await fetch(
      `${getApiBase()}/devices/batch-create`,
      {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          proveedor,
          orden_instalacion: orden,
          numero_pedido: pedido,
          contrato,
          fecha_ingreso: fecha,
          template_id: Number(templateId),
          ciudad,
          sede,
          placas: codigosArray
        })
      }
    )

    if (response.ok) {
      const data = await response.json()
      setResultado(data)
      setCodigosTexto('')
    } else {
      alert('Error creando lote')
    }
  }

  return (
    <InventoryPageShell
      title="Ingreso nuevo dispositivo a bodega"
      description="Defina plantilla, datos del lote y pegue las placas (una por línea) para crear el ingreso."
    >

      {!canWrite && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Solo visualización: no puede crear lotes.
        </Alert>
      )}

      <InventoryFormPanel sx={{ mb: 3 }}>

        <Grid container spacing={3}>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                fullWidth
                label="Plantilla"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.nombre_modelo}
                  </MenuItem>
                ))}
              </TextField>

              <Button
                variant="outlined"
                onClick={() => router.push('/nuevo/plantilla')}
              >
                + Nueva
              </Button>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Proveedor" value={proveedor}
              onChange={(e) => setProveedor(e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Orden Instalación"
              value={orden}
              onChange={(e) => setOrden(e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Número Pedido"
              value={pedido}
              onChange={(e) => setPedido(e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Contrato"
              value={contrato}
              onChange={(e) => setContrato(e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField type="date" fullWidth
              label="Fecha Ingreso"
              InputLabelProps={{ shrink: true }}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Ciudad"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Sede"
              value={sede}
              onChange={(e) => setSede(e.target.value)} />
          </Grid>

        </Grid>
      </InventoryFormPanel>

      <InventoryFormPanel sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Códigos ML (uno por línea)
        </Typography>

        <TextField
          fullWidth
          multiline
          minRows={8}
          value={codigosTexto}
          onChange={(e) => setCodigosTexto(e.target.value)}
        />
      </InventoryFormPanel>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="contained" size="large" onClick={crearLote} disabled={!canWrite}>
          Crear Lote
        </Button>
      </Box>

      {resultado && (
        <Box sx={{ mt: 4 }}>
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Lote #{resultado.batch_id} creado<br />
            Total enviados: {resultado.total_enviados}<br />
            Creados: {resultado.creados}<br />
            Duplicados: {resultado.duplicados.length}
          </Alert>
        </Box>
      )}

    </InventoryPageShell>
  )
}