'use client'

import type { ReactNode } from 'react'
import { Paper } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'

export default function InventoryFormPanel({
  children,
  sx,
}: {
  children: ReactNode
  sx?: SxProps<Theme>
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: (t) => `0 12px 40px ${alpha(t.palette.common.black, 0.05)}`,
        ...sx,
      }}
    >
      {children}
    </Paper>
  )
}
