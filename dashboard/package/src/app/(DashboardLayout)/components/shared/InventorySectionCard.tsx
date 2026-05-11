'use client'

import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'

export default function InventorySectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.07),
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { width: 20, height: 20 } }}>
          {icon}
        </Box>
        <Typography variant="subtitle2" fontWeight={700} letterSpacing={0.2}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Box>
  )
}
