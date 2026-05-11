import { useEffect, useMemo, useState } from 'react'
import { Box, Grid, Paper, Typography } from '@mui/material'
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard'
import { getDevices } from '@/services/devices'

type Device = {
  sede?: string | null
}

export default function InventoryBlog() {
  const [devices, setDevices] = useState<Device[]>([])

  useEffect(() => {
    const load = async () => {
      const data = await getDevices()
      setDevices(data)
    }
    load()
  }, [])

  const topSedes = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of devices) {
      const sede = (d.sede || '').trim().toUpperCase()
      if (!sede) continue
      map.set(sede, (map.get(sede) || 0) + 1)
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([sede, total], idx) => ({ id: idx, sede, total }))
  }, [devices])

  return (
    <DashboardCard title="Top Sedes" subtitle="Equipos por sede (últimos datos)">
      <Box sx={{ mt: 2 }}>
        {topSedes.length === 0 ? (
          <Typography color="text.secondary">No hay datos para mostrar.</Typography>
        ) : (
          <Grid container spacing={2}>
            {topSedes.map((s) => (
              <Grid key={s.id} size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {s.sede}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {s.total}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </DashboardCard>
  )
}

