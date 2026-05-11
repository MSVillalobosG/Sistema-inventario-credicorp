/** Borrador del acta de salida (tras asignar equipo). Se guarda en sessionStorage. */
export const ACTA_SALIDA_STORAGE_KEY = 'inventario_acta_salida_draft'

export type ActaSalidaDraft = {
  placa: string
  usuarioRed: string
  nombreUsuario: string
  documento?: string | null
  email?: string | null
  sedeUsuario?: string | null
  cargo?: string | null
  device: {
    id?: number
    placa_equipo?: string | null
    marca?: string | null
    modelo?: string | null
    serial_number?: string | null
    nombre_equipo?: string | null
    tipo_equipo?: string | null
    sistema_operativo?: string | null
    tipo_procesador?: string | null
    capacidad_ram?: string | null
    tipo_ram?: string | null
    tipo_disco?: string | null
    capacidad_disco?: string | null
    sede?: string | null
    tipo_contrato?: string | null
    ip_consola?: string | null
  }
  asignadoEn: string
}

export function saveActaSalidaDraft(draft: ActaSalidaDraft) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ACTA_SALIDA_STORAGE_KEY, JSON.stringify(draft))
}

export function readActaSalidaDraft(): ActaSalidaDraft | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(ACTA_SALIDA_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as ActaSalidaDraft
  } catch {
    return null
  }
}

export function clearActaSalidaDraft() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ACTA_SALIDA_STORAGE_KEY)
}
