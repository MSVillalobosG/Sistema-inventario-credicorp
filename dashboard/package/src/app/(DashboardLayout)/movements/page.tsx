"use client";

import { Grid, Typography } from "@mui/material";
import PageContainer from "../components/container/PageContainer";
import DashboardCard from "../components/shared/DashboardCard";

export default function MovementsPage() {
  return (
    <PageContainer title="Movimientos" description="Gestión de movimientos de dispositivos">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <DashboardCard title="Historial de Movimientos">
            <Typography>
              Aquí se mostrarán los movimientos del inventario.
            </Typography>
          </DashboardCard>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
