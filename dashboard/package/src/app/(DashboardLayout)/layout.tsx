"use client";

import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { useRouter } from "next/navigation";
import Sidebar from "./layout/sidebar/Sidebar";
import Header from "./layout/header/Header";
import { isAuthenticated } from "@/services/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/authentication/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <Box sx={{ display: "flex", maxWidth: "100vw", overflowX: "hidden", minHeight: "100vh" }}>
      <Sidebar />
      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          bgcolor: "#f4f6fa",
        }}
      >
        <Header />
        <Box
          sx={{
            flex: 1,
            px: { xs: 1.5, md: 2 },
            py: { xs: 1, md: 1.5 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}