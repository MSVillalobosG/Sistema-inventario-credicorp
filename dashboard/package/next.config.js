const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  /**
   * Importa solo los componentes MUI que se usan en cada ruta (menos JS al navegar / compilar).
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports
   */
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
  /**
   * Hay otro package-lock en la raíz del repo; sin esto Turbopack asume mal el workspace
   * y puede fallar la resolución de módulos (pantalla en blanco / errores raros).
   */
  turbopack: {
    root: path.join(__dirname),
  },
}

module.exports = nextConfig
