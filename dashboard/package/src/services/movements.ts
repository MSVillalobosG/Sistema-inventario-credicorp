import { fetcher } from "./api";

/** Respuesta de `GET /movements/feed` (timeline global del dashboard). */
export type MovementFeedItem = {
  id: number;
  device_id: number;
  type: string;
  notes?: string | null;
  from_user_id?: number | null;
  to_user_id?: number | null;
  created_at: string | null;
  placa_equipo?: string | null;
  sede?: string | null;
  usuario_asignado?: string | null;
  estado?: string | null;
  actor_email?: string | null;
  actor_display_name?: string | null;
};

export function getMovementFeed(limit = 50) {
  const q = new URLSearchParams({ limit: String(limit) });
  return fetcher(`/movements/feed?${q}`) as Promise<MovementFeedItem[]>;
}

export type DeviceMovementRow = {
  id: number;
  type: string;
  notes: string | null;
  created_at: string | null;
  actor_email: string | null;
  actor_display_name: string | null;
};

export function getMovementsByDevice(deviceId: number) {
  return fetcher(`/movements/by-device/${deviceId}`) as Promise<DeviceMovementRow[]>;
}

/** Historial por placa: mismo prefijo `/devices` que la consulta (evita fallos de ruta/CORS). */
export function getMovementsByPlaca(placa: string) {
  const p = placa.trim();
  return fetcher(
    `/devices/by-placa/${encodeURIComponent(p)}/movements`
  ) as Promise<DeviceMovementRow[]>;
}
