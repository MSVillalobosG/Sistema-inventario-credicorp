import type { Metadata } from 'next'
import ThemeRegistry from './ThemeRegistry'

export const metadata: Metadata = {
  title: 'Inventario — Credicorp',
  description: 'Panel de inventario de equipos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  )
}
