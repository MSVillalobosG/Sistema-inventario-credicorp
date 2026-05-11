'use client'

import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'

export default function InventoryInfoRow({ label, value }: { label: string; value: unknown }) {
  const display =
    value === null || value === undefined || value === '' ? '—' : String(value)
  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: 2,
        bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
        border: '1px solid',
        borderColor: (t) => alpha(t.palette.divider, 0.9),
        height: '100%',
      }}
    >
      <Typography
        variant="overline"
        sx={{
          color: 'text.secondary',
          letterSpacing: 0.6,
          fontSize: '0.65rem',
          lineHeight: 1.2,
          display: 'block',
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          mt: 0.75,
          lineHeight: 1.45,
          wordBreak: 'break-word',
        }}
      >
        {display}
      </Typography>
    </Box>
  )
}
