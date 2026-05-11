import type { ReactNode } from 'react'
import { Box } from '@mui/material'

/** Prefijos de línea que se muestran en negrita (orden: más largo primero para no pisar subcadenas). */
const TRAZA_LABEL_PREFIXES: string[] = [
  'Equipo anterior · placa:',
  'Equipo nuevo · placa:',
  'Usuario de referencia/titular:',
  'Usuario de referencia / titular:',
  'Usuario de red (titular):',
  'Asignado a usuario de red:',
  'Usuario Asignado:',
  'Cambio realizado por:',
  'Proceso realizado por:',
  'Equipo · placa:',
  'Cambio de equipo:',
  'IP del reporte:',
  'Origen:',
  'Serial:',
]

function lineWithBoldLabel(line: string): ReactNode {
  const s = line
  for (const prefix of TRAZA_LABEL_PREFIXES) {
    if (s.startsWith(prefix)) {
      return (
        <>
          <Box component="strong" sx={{ fontWeight: 700 }}>
            {prefix}
          </Box>
          {s.slice(prefix.length)}
        </>
      )
    }
  }
  return s
}

/** Renderiza notas de traza multilínea con etiquetas clave en negrita. */
export function FormattedTraceNotes({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <Box
      component="div"
      sx={{ display: 'block', width: '100%', overflow: 'visible' }}
    >
      {lines.map((line, i) => (
        <Box
          key={i}
          component="div"
          sx={{
            display: 'block',
            width: '100%',
            minHeight: line.length ? '1.35em' : '0.4em',
            lineHeight: 1.6,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            py: line.length ? 0.125 : 0,
          }}
        >
          {line.length === 0 ? null : lineWithBoldLabel(line)}
        </Box>
      ))}
    </Box>
  )
}
