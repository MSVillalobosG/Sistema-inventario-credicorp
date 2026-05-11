'use client'

import Dashboard from '@/app/(DashboardLayout)/page'

export default function DashboardRoute() {
  // Alias para que el menú “Dashboard” (URL /dashboard) muestre el mismo contenido
  // que la home del App Router (URL /).
  return <Dashboard />
}

