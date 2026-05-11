'use client'

import { Box, Skeleton, Stack } from '@mui/material'

/**
 * Se muestra al cambiar de ruta dentro del panel mientras Next carga el trozo JS de la página.
 * Mejora la sensación de respuesta (sobre todo en `next dev`).
 */
export default function DashboardRouteLoading() {
  return (
    <Box sx={{ py: 0.5, width: '100%', maxWidth: '100%' }} aria-busy="true" aria-label="Cargando página">
      <Skeleton variant="rounded" width="38%" height={36} sx={{ mb: 2, maxWidth: 360 }} />
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={56} />
        <Skeleton variant="rounded" height={200} />
        <Skeleton variant="rounded" height={160} />
      </Stack>
    </Box>
  )
}
