'use client'
import { Grid, Box } from '@mui/material'
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer'

import InventoryDashboardSnapshot from '@/app/(DashboardLayout)/components/dashboard/InventoryDashboardSnapshot'
import InventoryMainCharts from '@/app/(DashboardLayout)/components/dashboard/InventoryMainCharts'
import InventoryRecentTransactions from '@/app/(DashboardLayout)/components/dashboard/InventoryRecentTransactions'

export default function Dashboard() {
  return (
    <PageContainer title="Dashboard" description="Panel principal">
      <Box
        sx={{
          bgcolor: (t) => t.palette.grey[100],
          borderRadius: 2,
          p: { xs: 2, md: 2.5 },
        }}
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <InventoryDashboardSnapshot />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <InventoryMainCharts bottomAside={<InventoryRecentTransactions />} />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  )
}
