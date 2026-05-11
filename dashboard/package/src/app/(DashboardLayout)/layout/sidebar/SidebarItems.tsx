'use client'

import React, { useEffect, useMemo, useState } from "react";
import Menuitems, { filterMenuByRole } from "./MenuItems";
import { getStoredUser } from "@/services/auth";
import { Box } from "@mui/material";
import {
  Logo,
  Sidebar as MUI_Sidebar,
  Menu,
  MenuItem,
  Submenu,
} from "react-mui-sidebar";
import { IconPoint } from '@tabler/icons-react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Upgrade } from "./Updrade";
import { GFT_ACCENT, GFT_PRIMARY } from "@/utils/theme/DefaultColors";

/**
 * Logo principal: public/images/logos/Logo recortado 123.png
 * Respaldo si falta el archivo anterior.
 */
const SIDEBAR_LOGO_FILES = ["Logo recortado 123.png", "Logo recortado.png"] as const;
/** Sube este número en prod si el PNG se queda cacheado. */
const SIDEBAR_LOGO_PROD_BUST = "v=35";

function logoUrl(file: string, bust: string) {
  return `/images/logos/${encodeURIComponent(file)}?${bust}`;
}

const renderMenuItems = (items: any, pathDirect: any) => {
  const isExactOrNested = (currentPath: string, href?: string) => {
    if (!href) return false;
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  const isSubmenuActive = (children: any[] = [], currentPath: string) => {
    return children.some((child) => isExactOrNested(currentPath, child?.href));
  };

  return items.map((item: any) => {

    const Icon = item.icon ? item.icon : IconPoint;

    const itemIcon = <Icon stroke={1.5} size="1.3rem" />;

    if (item.subheader) {
      // Display Subheader
      return (
        <Menu
          subHeading={item.subheader}
          key={item.subheader}
        />
      );
    }

    //If the item has children (submenu)
    if (item.children) {
      const submenuActive = isSubmenuActive(item.children, pathDirect);
      return (
        <Submenu
          key={`${item.id}-${pathDirect}`}
          title={item.title}
          icon={itemIcon}
          borderRadius='7px'
          isSelected={submenuActive}
          open={submenuActive}
        >
          {renderMenuItems(item.children, pathDirect)}
        </Submenu>
      );
    }

    // If the item has no children, render a MenuItem

    return (
      <Box px={3} key={item.id}>
        <MenuItem
          key={item.id}
          isSelected={isExactOrNested(pathDirect, item?.href)}
          borderRadius='8px'
          icon={itemIcon}
          link={item.href}
          component={Link}
        >
          {item.title}
        </MenuItem >
      </Box>

    );
  });
};


const SidebarItems = () => {
  const pathname = usePathname();
  const pathDirect = pathname;

  const visibleMenu = useMemo(
    () => filterMenuByRole(Menuitems, getStoredUser()?.role),
    [pathname]
  );

  const [fileIndex, setFileIndex] = useState(0);
  const [logoSrc, setLogoSrc] = useState(() => {
    const bust =
      process.env.NODE_ENV === "development"
        ? `t=${Date.now()}`
        : SIDEBAR_LOGO_PROD_BUST;
    return logoUrl(SIDEBAR_LOGO_FILES[0], bust);
  });

  useEffect(() => {
    const bust =
      process.env.NODE_ENV === "development"
        ? `t=${Date.now()}`
        : SIDEBAR_LOGO_PROD_BUST;
    setLogoSrc(logoUrl(SIDEBAR_LOGO_FILES[fileIndex], bust));
  }, [fileIndex]);

  const handleLogoError = () => {
    setFileIndex((i) =>
      i < SIDEBAR_LOGO_FILES.length - 1 ? i + 1 : i
    );
  };

  return (
    < >
      <MUI_Sidebar
        width={"100%"}
        showProfile={false}
        themeColor={GFT_PRIMARY}
        themeSecondaryColor={GFT_ACCENT}
      >

        <Box display="flex" justifyContent="center" py={1.5} px={0.5}>
          <Link href="/" style={{ display: "block", width: "100%" }}>
            <Box
              sx={{
                width: "100%",
                height: 168,
                maxWidth: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={logoSrc}
                alt="GFT Credicorp Capital"
                onError={handleLogoError}
                style={{
                  width: "100%",
                  height: "100%",
                  maxWidth: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </Box>
          </Link>
        </Box>
        {renderMenuItems(visibleMenu, pathDirect)}
      </MUI_Sidebar>

    </>
  );
};
export default SidebarItems;
