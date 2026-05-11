'use client'

import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export default function InventoryPageShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  const theme = useTheme()
  const gradA = theme.palette.primary.dark
  const gradB = theme.palette.primary.main

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        px: { xs: 1.5, sm: 2, md: 2.5, lg: 3 },
        py: { xs: 2, md: 3 },
        pb: 5,
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: -0.5,
            background: `linear-gradient(135deg, ${gradA} 0%, ${gradB} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75, maxWidth: 640 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  )
}
