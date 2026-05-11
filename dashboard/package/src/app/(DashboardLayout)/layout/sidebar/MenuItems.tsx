import {
  IconLayoutDashboard,
  IconDeviceLaptop,
  IconArrowsTransferUp,
  IconPlus,
  IconChartBar,
  IconUserPlus,
  IconRepeat,
  IconSwitchHorizontal,
  IconSearch,
  IconLifebuoy,
  IconUserCog,
} from "@tabler/icons-react";

import { uniqueId } from "lodash";

const Menuitems = [

  // =====================
  // INVENTARIO
  // =====================
  {
    navlabel: true,
    subheader: "INVENTARIO",
  },
  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconLayoutDashboard,
    // Alias funcional para que exista /dashboard
    href: "/dashboard",
  },
  {
    id: uniqueId(),
    title: "Dispositivos",
    icon: IconDeviceLaptop,
    href: "/devices",
  },
  {
    id: uniqueId(),
    title: "Movimientos",
    icon: IconArrowsTransferUp,
    children: [
      {
        id: uniqueId(),
        title: "Asignación de Equipo",
        icon: IconArrowsTransferUp,
        href: "/movements/assign",
      },
      {
        id: uniqueId(),
        title: "Equipos de Cambio",
        icon: IconRepeat,
        href: "/movements/return",
      },
      {
        id: uniqueId(),
        title: "Cambio de Equipo",
        icon: IconSwitchHorizontal,
        href: "/movements/change",
      },
    ],
  },
  {
  id: uniqueId(),
  title: "Nuevo",
  icon: IconPlus,
  children: [
    {
      id: uniqueId(),
      title: "Nuevo Dispositivo",
      icon: IconDeviceLaptop,
      href: "/nuevo/dispositivo",   // ✅
    },
    {
      id: uniqueId(),
      title: "Nuevo Usuario",
      icon: IconUserPlus,
      href: "/nuevo/usuario",       // ✅
    },
  ],
},

  // =====================
  // CONSULTA
  // =====================
  {
    navlabel: true,
    subheader: "CONSULTA",
  },
  {
    id: uniqueId(),
    title: "Consulta de Equipos",
    icon: IconSearch,
    href: "/consulta",
  },
  {
    id: uniqueId(),
    title: "Gestión de usuarios",
    icon: IconUserCog,
    href: "/consulta/gestion-usuarios",
  },

  // =====================
  // BAJA
  // =====================
  {
    navlabel: true,
    subheader: "BAJA",
  },
  {
    id: uniqueId(),
    title: "Equipos de Baja",
    icon: IconSearch,
    href: "/baja",
  },

  // =====================
  // REPORTES
  // =====================
  {
    navlabel: true,
    subheader: "REPORTES",
  },
  {
    id: uniqueId(),
    title: "Métricas",
    icon: IconChartBar,
    href: "/metrics",
  },

  // =====================
  // SOPORTE / ADMINISTRACIÓN
  // =====================
  {
    navlabel: true,
    subheader: "SOPORTE",
  },
  {
    id: uniqueId(),
    title: "Soporte",
    icon: IconLifebuoy,
    href: "/soporte",
  },
  {
    id: uniqueId(),
    title: "Configuración de cuentas",
    icon: IconUserCog,
    href: "/configuracion/cuentas",
  },
];

export const CONFIG_CUENTAS_HREF = "/configuracion/cuentas";

/** Rutas de alta/cambio de inventario: ocultas para rol solo lectura. */
const VIEWER_HIDDEN_HREFS = new Set([
  "/movements/assign",
  "/movements/acta-salida",
  "/movements/return",
  "/movements/change",
  "/nuevo",
  "/nuevo/dispositivo",
  "/nuevo/usuario",
  "/nuevo/plantilla",
]);

type MenuEntry = (typeof Menuitems)[number];

export function filterMenuByRole(items: typeof Menuitems, role?: string) {
  const out: MenuEntry[] = [];

  for (const item of items) {
    const anyItem = item as MenuEntry & {
      href?: string;
      children?: MenuEntry[];
    };

    if (anyItem.children?.length) {
      const ch = anyItem.children.filter((c) => {
        const h = (c as { href?: string }).href || "";
        if (role === "viewer" && VIEWER_HIDDEN_HREFS.has(h)) return false;
        return true;
      });
      if (ch.length === 0) continue;
      out.push({ ...anyItem, children: ch } as MenuEntry);
      continue;
    }

    const href = anyItem.href;
    if (href && VIEWER_HIDDEN_HREFS.has(href) && role === "viewer") {
      continue;
    }
    if (href === CONFIG_CUENTAS_HREF && role !== "super_admin") {
      continue;
    }

    out.push(item);
  }

  return out;
}

export default Menuitems;