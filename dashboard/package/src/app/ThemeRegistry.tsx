'use client'

import * as React from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { baselightTheme } from '@/utils/theme/DefaultColors'

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={baselightTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}
