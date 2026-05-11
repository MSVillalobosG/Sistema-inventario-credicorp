const DEFAULT_API_ORIGIN = "http://127.0.0.1:7000";

function normalizeOrigin(base: string): string {
  return base.replace(/\/$/, "");
}

/**
 * URL base del API (FastAPI).
 *
 * Por defecto usa la misma URL directa que antes (`NEXT_PUBLIC_API_BASE` o :7000).
 * El proxy `/inv-api` en `next.config.ts` solo se usa si defines
 * `NEXT_PUBLIC_USE_INV_PROXY=true` (por si en algún entorno falla CORS o el puerto).
 */
export function getApiBase(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_API_BASE || process.env.BACKEND_PROXY_TARGET;

  if (typeof window === "undefined") {
    return normalizeOrigin(fromEnv || DEFAULT_API_ORIGIN);
  }

  if (process.env.NEXT_PUBLIC_USE_INV_PROXY === "true") {
    return "/inv-api";
  }

  return normalizeOrigin(fromEnv || DEFAULT_API_ORIGIN);
}


/** Debe coincidir con `AUTH_SESSION_KEY` en `auth.ts` */
const AUTH_SESSION_KEY = "inv.auth.session";

function bearerFromStorage(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return undefined;
    const j = JSON.parse(raw) as { token?: string };
    return j.token && j.token.length > 0 ? j.token : undefined;
  } catch {
    return undefined;
  }
}

/** Cabeceras con Bearer para `fetch` manual (mismas reglas que `fetcher`). */
export function getAuthHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  const bearer = bearerFromStorage();
  const h: Record<string, string> = {
    "Cache-Control": "no-cache",
    ...(extra || {}),
  };
  if (bearer) h["Authorization"] = `Bearer ${bearer}`;
  return h;
}

export async function fetcher(url: string, options?: RequestInit) {
  const bearer = bearerFromStorage();
  const mergedOptions: RequestInit = {
    cache: "no-store",
    ...(options || {}),
    headers: {
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(options?.headers || {}),
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  };

  const base = getApiBase();
  const apiUrl = `${base}${url}`;

  let res: Response;
  try {
    res = await fetch(apiUrl, mergedOptions);
  } catch (err) {
    const isNetwork =
      err instanceof TypeError &&
      (String(err.message).includes("fetch") ||
        String(err.message).includes("Failed to fetch") ||
        String(err.message).includes("NetworkError"));
    if (isNetwork) {
      throw new Error(
        `Sin conexión con el API (${apiUrl}). ¿El backend está en marcha? Revise el proxy /inv-api y el puerto.`
      );
    }
    throw err;
  }

  if (!res.ok) {
    let message = "Error en la API";

    try {
      const data = await res.json();
      if (data?.detail) {
        message = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // si no es JSON, dejamos el mensaje genérico
    }

    if (res.status === 404) {
      message = `${message} — ${apiUrl}`;
    }

    if (res.status === 401 && typeof window !== "undefined") {
      try {
        localStorage.removeItem(AUTH_SESSION_KEY);
      } catch {
        /* ignore */
      }
      message = `${message} Vuelva a iniciar sesion en /authentication/login.`;
    }

    throw new Error(message);
  }

  return res.json();
}
