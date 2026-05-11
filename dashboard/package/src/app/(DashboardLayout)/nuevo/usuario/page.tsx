"use client";

import { Box, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

export default function NuevoPage() {
  const router = useRouter();

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>
        Crear Nuevo Registro
      </Typography>

      <Box display="flex" gap={3} flexWrap="wrap">
        <Card sx={{ width: 280 }}>
          <CardActionArea onClick={() => router.push("/nuevo/usuario")}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Nuevo Usuario
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Registrar un nuevo usuario en el sistema.
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>

        <Card sx={{ width: 280 }}>
          <CardActionArea onClick={() => router.push("/nuevo/dispositivo")}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Nuevo Dispositivo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Registrar un nuevo dispositivo.
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </Box>
  );
}