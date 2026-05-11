import { fetcher } from "./api";

export const getDevices = () => fetcher("/devices");
export const getDeviceByPlaca = (placa: string) =>
  fetcher(`/devices/by-placa/${encodeURIComponent(placa.trim())}`);

export type ReturnDeviceAccion = "REASIGNAR" | "REPARACION" | "BAJA";

export function returnDeviceByPlaca(placa: string, accion: ReturnDeviceAccion) {
  const q = new URLSearchParams({ placa, accion });
  return fetcher(`/devices/return-device?${q.toString()}`, { method: "PUT" });
}

export function adminPatchDevice(id: number, body: Record<string, unknown>) {
  const sid = String(id).trim();
  if (!/^\d+$/.test(sid)) {
    throw new Error("ID de equipo inválido para guardar cambios.");
  }
  // PUT: mismo cuerpo parcial que PATCH; evita 404 en proxies o despliegues que solo exponen PUT.
  return fetcher(`/devices/record/${sid}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function adminDeleteDevice(id: number) {
  return fetcher(`/devices/record/${id}`, { method: "DELETE" });
}

/**
 * Asigna o reasigna usuario vía PATCH (el PUT /assign solo aplica si el equipo está sin asignar).
 */
export async function adminAssignUserToDevice(
  id: number,
  payload: {
    usuario_asignado: string;
    nombre_usuario_asignado?: string | null;
    correo_usuario?: string | null;
  },
) {
  await adminPatchDevice(id, {
    usuario_asignado: payload.usuario_asignado.trim(),
    nombre_usuario_asignado: (payload.nombre_usuario_asignado || "").trim() || null,
    correo_usuario: (payload.correo_usuario || "").trim() || null,
    estado: "ASIGNADO",
  });
}
