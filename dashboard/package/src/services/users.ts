import { fetcher } from './api'

/** Maestro de usuarios de inventario (misma fuente que Gestión de usuarios). */
export type InventoryUser = {
  id: number
  nombre: string
  email: string
  documento: string
  usuario: string
  cargo?: string | null
  sede?: string | null
}

export const getInventoryUsers = () => fetcher('/users/') as Promise<InventoryUser[]>
