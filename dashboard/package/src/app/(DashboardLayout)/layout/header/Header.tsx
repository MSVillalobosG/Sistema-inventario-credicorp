import React from 'react'
import { Box, Button } from '@mui/material'
import Link from 'next/link'
import Profile from './Profile'
import { usePathname } from 'next/navigation'

interface ItemType {
  toggleMobileSidebar: (event: React.MouseEvent<HTMLElement>) => void;
}

const Header = ({ toggleMobileSidebar }: ItemType) => {
  const pathname = usePathname()
  const hideHeaderActions = pathname === '/devices'

  return (
    <Box
  sx={{
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    px: 1,
    py: 0,   // 🔥 controla el alto con padding
    borderBottom: "1px solid #e0e0e0",
    backgroundColor: "#fff",
  }}
>
      {!hideHeaderActions && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            component={Link}
            href="/authentication/login"
            disableElevation
          >
            Acceso
          </Button>

          <Profile />
        </Box>
      )}
    </Box>
  )
}

export default Header