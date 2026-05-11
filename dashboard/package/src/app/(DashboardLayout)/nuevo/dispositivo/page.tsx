'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { getApiBase, getAuthHeaders } from '@/services/api'
import { canWriteInventory } from '@/services/auth'
import InventoryFormPanel from '@/app/(DashboardLayout)/components/shared/InventoryFormPanel'
import InventoryPageShell from '@/app/(DashboardLayout)/components/shared/InventoryPageShell'
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  Grid,
  Alert
} from '@mui/material'

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
  const [accesorios, setAccesorios] = useState('')
  const [placasTexto, setPlacasTexto] = useState('')
  const [resultado, setResultado] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)

  // refs persistentes para el scanner
  const scannedSetRef = useRef(new Set<string>())
  const bufferRef = useRef('')
  const lastProcessedRef = useRef(0)

  // Heuristica: los codigos esperados parecen ser `ML-` o `CC-` + 6 digitos.
  // Si el scanner entrega `ML-244313244313...` (sin separador), lo dividimos en chunks de 6.
  const ML_DIGITS_LEN = 6

  const splitDigitsIntoCodes = (digits: string, prefix: 'ML' | 'CC') => {
    if (!digits) return []
    if (digits.length === ML_DIGITS_LEN) return [`${prefix}-${digits}`]
    if (digits.length > ML_DIGITS_LEN && digits.length % ML_DIGITS_LEN === 0) {
      const chunks = digits.match(new RegExp(`.{${ML_DIGITS_LEN}}`, 'g')) ?? []
      return chunks.map(c => `${prefix}-${c}`)
    }
    return [`${prefix}-${digits}`]
  }

  const inferPrefixForNumeric = (digits: string): 'ML' | 'CC' => {
    // Regla operativa actual:
    // - Placas numericas que empiezan por 101... corresponden a Credicorp (CC)
    // - El resto de numericos se asume Milenio (ML)
    return digits.startsWith('101') ? 'CC' : 'ML'
  }

  const extractMLCodesFromText = (text: string) => {
    const out: string[] = []

    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    for (const line of lines) {
      const upper = line.toUpperCase()
      const mlMatch = upper.match(/ML\D*(\d+)/)
      if (mlMatch) {
        const digits = mlMatch[1] ?? ''
        out.push(...splitDigitsIntoCodes(digits, 'ML'))
        continue
      }

      const ccMatch = upper.match(/CC\D*(\d+)/)
      if (ccMatch) {
        const digits = ccMatch[1] ?? ''
        out.push(...splitDigitsIntoCodes(digits, 'CC'))
        continue
      }

      // Solo numerico: inferimos prefijo por regla operativa.
      // Si trae letras distintas de ML/CC, se ignora.
      if (/^\d+$/.test(line)) {
        const digits = line
        out.push(...splitDigitsIntoCodes(digits, inferPrefixForNumeric(digits)))
      }
    }

    return out
  }

  const normalizePlacasTexto = (text: string) => {
    const codes = extractMLCodesFromText(text)

    // Preserve order while deduping
    const seen = new Set<string>()
    const out: string[] = []
    for (const code of codes) {
      if (!seen.has(code)) {
        seen.add(code)
        out.push(code)
      }
    }

    return out.join('\n')
  }

  /*
  ===============================
  CARGAR PLANTILLAS
  ===============================
  */

  useEffect(() => {
    fetch(`${getApiBase()}/templates/`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTemplates(data)
        }
      })
  }, [])

  /*
  ===============================
  SCANNER HANDLER
  ===============================
  */

  useEffect(() => {

    const handleKey = (e: KeyboardEvent) => {

      if (e.key === 'Enter') {

        const now = Date.now()

        // bloquear doble Enter del scanner
        if (now - lastProcessedRef.current < 200) {
          bufferRef.current = ''
          return
        }

        lastProcessedRef.current = now

        const raw = bufferRef.current.trim()
        bufferRef.current = ''

        if (!raw) return

        const codesExtracted = extractMLCodesFromText(raw)
        if (codesExtracted.length === 0) return

        // Solo agregamos los que no existan (para que un mismo equipo escaneado 4 veces quede como 1).
        const codesToAdd: string[] = []
        for (const codigo of codesExtracted) {
          if (scannedSetRef.current.has(codigo)) continue
          scannedSetRef.current.add(codigo)
          codesToAdd.push(codigo)
        }

        if (codesToAdd.length === 0) return

        setPlacasTexto(prev => {
          const suffix = codesToAdd.join('\n')
          const next = prev ? `${prev}\n${suffix}` : suffix
          return normalizePlacasTexto(next)
        })

        return
      }

      // acumular caracteres del scanner
      if (e.key.length === 1) {
        bufferRef.current += e.key
      }

    }

    window.addEventListener('keydown', handleKey)

    return () => window.removeEventListener('keydown', handleKey)

  }, [])

  /*
  ===============================
  CREAR LOTE
  ===============================
  */

  const crearLote = async () => {
    if (!canWrite) {
      alert('Su cuenta solo tiene permiso de visualización.')
      return
    }
    // Extraemos y partimos cualquier ML concatenado antes de enviar.
    const codigosML = extractMLCodesFromText(placasTexto)

    // Dedupe final antes de enviar al backend (evita duplicados si el scanner dispara varias veces).
    const uniqueCodigosML = Array.from(new Set(codigosML))
    const removed = codigosML.length - uniqueCodigosML.length
    if (removed > 0) {
      alert(`Se eliminaron ${removed} duplicados de códigos ML antes de crear el lote.`)
    }

    if (!templateId || uniqueCodigosML.length === 0) {
      alert("Debe seleccionar plantilla y escanear códigos ML")
      return
    }

    try {
      setGuardando(true)
      setResultado(null)

      const response = await fetch(
        `${getApiBase()}/batches/create`,
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
            accesorios,
            codigos_ml: uniqueCodigosML
          })
        }
      )

      const text = await response.text()
      let data: any = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = null
      }

      if (response.ok) {
        const successData = data ?? {
          batch_id: 'N/A',
          devices_created: uniqueCodigosML.length
        }

        setResultado(successData)
        setPlacasTexto('')

        // limpiar memoria de escaneo
        scannedSetRef.current.clear()

        alert(
          `Lote creado correctamente. ID: ${successData.batch_id} | Equipos: ${successData.devices_created}`
        )
      } else {
        const detail = data?.detail || text || 'Error creando lote'
        alert(`Error creando lote: ${detail}`)
      }
    } catch (error: any) {
      alert(`No se pudo conectar al backend: ${error?.message || 'Error desconocido'}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <InventoryPageShell
      title="Ingreso nuevo dispositivo a bodega"
      description="Complete el lote y los códigos; compatible con escáner de teclado."
    >

      {!canWrite && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Solo visualización: no puede crear lotes en bodega.
        </Alert>
      )}

      {/* PASO 1 */}

      <InventoryFormPanel sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 3 }}>
          Paso 1 — Información del lote
        </Typography>

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
            <TextField fullWidth label="Proveedor"
              value={proveedor}
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
            <TextField
              type="date"
              fullWidth
              label="Fecha Ingreso"
              InputLabelProps={{ shrink: true }}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
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

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Accesorios (Ej: Maletín, Adaptador)"
              value={accesorios}
              onChange={(e) => setAccesorios(e.target.value)}
            />
          </Grid>

        </Grid>
      </InventoryFormPanel>

      {/* PASO 2 */}

      <InventoryFormPanel sx={{ mb: 3 }}>

        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Paso 2 — Códigos ML del lote
        </Typography>

        <TextField
          fullWidth
          multiline
          minRows={8}
          label="Códigos ML del lote"
          value={placasTexto}
          onChange={(e) => setPlacasTexto(normalizePlacasTexto(e.target.value))}
        />

        <Typography sx={{ mt: 2 }}>
          Equipos escaneados: {
            placasTexto.split('\n').filter(p => p.trim() !== '').length
          }
        </Typography>

      </InventoryFormPanel>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          disabled={guardando || !canWrite}
          onClick={crearLote}
        >
          {guardando ? 'Creando...' : 'Crear Lote'}
        </Button>
      </Box>

      {resultado && (
        <Box sx={{ mt: 4 }}>
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Lote #{resultado.batch_id} creado<br />
            Equipos creados: {resultado.devices_created}
          </Alert>
        </Box>
      )}

    </InventoryPageShell>
  )
}