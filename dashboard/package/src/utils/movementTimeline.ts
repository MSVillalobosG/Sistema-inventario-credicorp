/** Etiquetas y formato compartidos: dashboard “Historial de movimientos” y consulta por equipo. */

export function labelMovimiento(tipo: string) {
  const u = (tipo || '').toUpperCase()
  const map: Record<string, string> = {
    INCOME: 'Ingreso / alta',
    ASSIGN: 'Asignación',
    REASSIGN: 'Reasignación / cambio',
    RETURN: 'Devolución',
    RETIRE: 'Baja / retiro',
  }
  return map[u] || u || 'Movimiento'
}

export function colorPorTipo(tipo: string) {
  const u = (tipo || '').toUpperCase()
  if (u === 'RETIRE') return 'error'
  if (u === 'RETURN') return 'warning'
  if (u === 'ASSIGN' || u === 'REASSIGN') return 'primary'
  if (u === 'INCOME') return 'success'
  return 'secondary'
}

/**
 * Parsea fechas de la API: valores UTC naive sin Z se interpretan como UTC
 * (compatibilidad con respuestas antiguas) para alinear con el reloj local del navegador.
 */
export function parseMovementInstant(iso: string): Date {
  let t = iso.trim()
  if (t.includes(' ') && !t.includes('T')) {
    t = t.replace(' ', 'T')
  }
  const hasTz = /[zZ]$/.test(t) || /[+-]\d{2}:?\d{2}$/.test(t)
  if (!hasTz) {
    t = t.includes('T') ? `${t}Z` : `${t}T00:00:00Z`
  }
  return new Date(t)
}

export function formatFechaTimeline(iso: string | null) {
  if (!iso) return '—'
  try {
    const d = parseMovementInstant(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
