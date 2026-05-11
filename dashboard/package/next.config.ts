import type { NextConfig } from "next";

/**
 * Proxy opcional: solo si en el cliente defines `NEXT_PUBLIC_USE_INV_PROXY=true`
 * (ver `getApiBase()` en `services/api.ts`). Por defecto el front llama al API
 * por URL directa (CORS ya está abierto en FastAPI).
 */
const backendTarget =
  process.env.BACKEND_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://127.0.0.1:7000";

const nextConfig: NextConfig = {
  async rewrites() {
    const base = backendTarget.replace(/\/$/, "");
    return [
      {
        source: "/inv-api/:path*",
        destination: `${base}/:path*`,
      },
    ];
  },
};

export default nextConfig;
