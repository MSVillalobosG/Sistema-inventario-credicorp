import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Menu,
  Button,
  IconButton,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { IconMail, IconUser } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { getStoredUser, logoutCurrentUser, type AuthUser } from "@/services/auth";

const Profile = () => {
  const router = useRouter();
  const [anchorEl2, setAnchorEl2] = useState(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const handleClick2 = (event: any) => {
    setAnchorEl2(event.currentTarget);
  };
  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }, [user?.name]);

  const handleLogout = async () => {
    handleClose2();
    await logoutCurrentUser();
    router.replace("/authentication/login");
  };

  return (
    <Box>
      <IconButton
        size="large"
        aria-label="show 11 new notifications"
        color="inherit"
        aria-controls="msgs-menu"
        aria-haspopup="true"
        sx={{
          ...(typeof anchorEl2 === "object" && {
            color: "primary.main",
          }),
        }}
        onClick={handleClick2}
      >
        <Avatar sx={{ width: 35, height: 35 }}>{initials}</Avatar>
      </IconButton>
      {/* ------------------------------------------- */}
      {/* Message Dropdown */}
      {/* ------------------------------------------- */}
      <Menu
        id="msgs-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        sx={{
          "& .MuiMenu-paper": {
            width: "200px",
          },
        }}
      >
        <MenuItem>
          <ListItemIcon>
            <IconUser width={20} />
          </ListItemIcon>
          <ListItemText>{user?.name || "Usuario"}</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <IconMail width={20} />
          </ListItemIcon>
          <ListItemText>{user?.email || "Sin correo"}</ListItemText>
        </MenuItem>
        <Box mt={1} py={1} px={2}>
          {user?.role && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Rol:{" "}
              {user.role === "super_admin"
                ? "Administrador general"
                : user.role === "admin"
                  ? "Administrador"
                  : user.role === "editor"
                    ? "Editor"
                    : "Solo visualización"}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {user?.provider === "microsoft" ? "Sesion empresarial Microsoft" : "Sesion local / API"}
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Profile;
