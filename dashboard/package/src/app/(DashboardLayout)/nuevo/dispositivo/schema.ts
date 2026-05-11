import { z } from "zod";

export const dispositivoSchema = z.object({
  nombre_equipo: z.string().min(3, "Nombre requerido"),
  tipo_equipo: z.string().min(1, "Seleccione tipo"),
  marca: z.string().min(2),
  modelo: z.string().min(2),
  ciudad: z.string().min(1),
  sede: z.string().min(1),
});