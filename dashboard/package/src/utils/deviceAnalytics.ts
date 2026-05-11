export type Device = {
  id: number
  sede?: string | null
  usuario_asignado?: string | null
  estado?: string | null
  origen?: string | null
  marca?: string | null
  modelo?: string | null
  tipo_equipo?: string | null
  ciudad?: string | null
}

export type SedeRow = {
  id: number
  sede: string
  total: number
  asignados: number
  enBodega: number
  pctAsignacion: number
}

export type DeviceAnalytics = {
  total: number
  asignados: number
  enBodegaLibre: number
  cambioPendiente: number
  baja: number
  enReparacion: number
  sinSede: number
  sinMarca: number
  usuariosConEquipo: number
  porOrigen: Record<string, number>
  topMarcas: [string, number][]
  estadoLabels: string[]
  estadoSeries: number[]
  sedeRows: SedeRow[]
  tasaAsignacionGlobal: number
  stockDisponiblePct: number
}

export function normalizeState(d: Device) {
  const estado = (d.estado || '').toUpperCase()
  const origen = (d.origen || '').toUpperCase()
  const asignado = !!d.usuario_asignado
  if (estado === 'CAMBIO_PENDIENTE') return 'CAMBIO_PENDIENTE'
  if (estado === 'ASIGNADO' || asignado) return 'ASIGNADO'
  if (estado === 'EN_BODEGA') return 'EN_BODEGA'
  if (estado === 'DE_BAJA' || origen === 'BAJA') return 'BAJA'
  if (estado === 'EN_REPARACION') return 'EN_REPARACION'
  return estado || 'OTROS'
}

export function computeDeviceAnalytics(devices: Device[]): DeviceAnalytics {
  const normalized = devices.map((d) => ({
    ...d,
    estadoN: normalizeState(d),
    sedeK: (d.sede || '').trim().toUpperCase(),
    asignado: !!d.usuario_asignado,
  }))

  const total = normalized.length
  const asignados = normalized.filter((d) => d.asignado).length
  const enBodegaLibre = normalized.filter(
    (d) => !d.asignado && d.estadoN === 'EN_BODEGA'
  ).length
  const cambioPendiente = normalized.filter((d) => d.estadoN === 'CAMBIO_PENDIENTE').length
  const baja = normalized.filter((d) => d.estadoN === 'BAJA').length
  const enReparacion = normalized.filter((d) => d.estadoN === 'EN_REPARACION').length
  const sinSede = normalized.filter((d) => !d.sedeK).length
  const sinMarca = normalized.filter((d) => !(d.marca || '').trim()).length

  const usuariosConEquipo = new Set(
    normalized.map((d) => (d.usuario_asignado || '').trim()).filter(Boolean)
  ).size

  const porOrigen: Record<string, number> = {}
  for (const d of normalized) {
    const o = (d.origen || 'NUEVO').toUpperCase()
    porOrigen[o] = (porOrigen[o] || 0) + 1
  }

  const porMarca = new Map<string, number>()
  for (const d of normalized) {
    const m = (d.marca || 'Sin marca').trim() || 'Sin marca'
    porMarca.set(m, (porMarca.get(m) || 0) + 1)
  }
  const topMarcas = Array.from(porMarca.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const estadoBuckets: Record<string, number> = {
    EN_BODEGA: 0,
    ASIGNADO: 0,
    CAMBIO_PENDIENTE: 0,
    BAJA: 0,
    EN_REPARACION: 0,
    OTROS: 0,
  }
  for (const d of normalized) {
    const k = d.estadoN
    if (k in estadoBuckets) estadoBuckets[k] += 1
    else estadoBuckets.OTROS += 1
  }

  const estadoEntries = Object.entries(estadoBuckets).filter(([, v]) => v > 0)
  const estadoLabels = estadoEntries.map(([k]) => k)
  const estadoSeries = estadoEntries.map(([, v]) => v)

  const sedeMap = new Map<string, { total: number; asignados: number; enBodega: number }>()
  for (const d of normalized) {
    const key = d.sedeK || '(Sin sede)'
    if (!sedeMap.has(key)) {
      sedeMap.set(key, { total: 0, asignados: 0, enBodega: 0 })
    }
    const row = sedeMap.get(key)!
    row.total += 1
    if (d.asignado) row.asignados += 1
    if (!d.asignado && d.estadoN === 'EN_BODEGA') row.enBodega += 1
  }

  const sedeRows = Array.from(sedeMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([sede, v], idx) => ({
      id: idx,
      sede,
      total: v.total,
      asignados: v.asignados,
      enBodega: v.enBodega,
      pctAsignacion: v.total ? Math.round((v.asignados / v.total) * 100) : 0,
    }))

  const tasaAsignacionGlobal = total ? Math.round((asignados / total) * 100) : 0
  const stockDisponiblePct = total ? Math.round((enBodegaLibre / total) * 100) : 0

  return {
    total,
    asignados,
    enBodegaLibre,
    cambioPendiente,
    baja,
    enReparacion,
    sinSede,
    sinMarca,
    usuariosConEquipo,
    porOrigen,
    topMarcas,
    estadoLabels,
    estadoSeries,
    sedeRows,
    tasaAsignacionGlobal,
    stockDisponiblePct,
  }
}

export function buildSedeChartTop10(sedeRows: SedeRow[]) {
  const top = sedeRows.slice(0, 10).filter((r) => r.sede !== '(Sin sede)')
  const withSin = sedeRows.find((r) => r.sede === '(Sin sede)')
  const rows = withSin ? [...top, withSin].slice(0, 10) : top
  return {
    categories: rows.map((r) => r.sede),
    values: rows.map((r) => r.total),
  }
}
