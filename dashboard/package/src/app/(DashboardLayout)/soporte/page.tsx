'use client'

import { Box, Paper, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material'
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer'
import { IconMail, IconPhone, IconBook } from '@tabler/icons-react'

export default function SoportePage() {
  return (
    <PageContainer title="Soporte" description="Ayuda y contacto">
      <Paper sx={{ p: 3, borderRadius: 2, border: 1, borderColor: 'divider' }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          Centro de soporte
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Para incidencias del inventario, accesos o el agente de recolección, utilice los canales oficiales
          de TI / Mesa de ayuda.
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <IconMail size={22} />
            </ListItemIcon>
            <ListItemText primary="Correo" secondary="Mesa de ayuda corporativa (según directorio interno)" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <IconPhone size={22} />
            </ListItemIcon>
            <ListItemText primary="Extensión / Línea" secondary="Consulte el listado de contactos de su sede" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <IconBook size={22} />
            </ListItemIcon>
            <ListItemText
              primary="Documentación"
              secondary="Procedimientos de bodega, asignación y bajas en el repositorio del proyecto"
            />
          </ListItem>
        </List>
        <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Typography variant="body2">
            La gestión de <strong>cuentas del panel</strong> y permisos la realiza el{' '}
            <strong>administrador general</strong> en <em>Configuración de cuentas</em>.
          </Typography>
        </Box>
      </Paper>
    </PageContainer>
  )
}
