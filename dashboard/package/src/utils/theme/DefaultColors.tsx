import { createTheme } from "@mui/material/styles";
import { Plus_Jakarta_Sans } from "next/font/google";

export const plus = Plus_Jakarta_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  fallback: ["Helvetica", "Arial", "sans-serif"],
});

/** Azul corporativo GFT / Credicorp (sidebar, botones, gráficas) */
export const GFT_PRIMARY = "#2E4FA9";
export const GFT_PRIMARY_DARK = "#1E3A7A";
export const GFT_PRIMARY_LIGHT = "#E4EBF7";
export const GFT_ACCENT = "#4A7FD7";
export const GFT_ACCENT_LIGHT = "#E8F1FB";
export const GFT_ACCENT_DARK = "#2E5FA3";

const baselightTheme = createTheme({
  direction: "ltr",
  palette: {
    primary: {
      main: GFT_PRIMARY,
      light: GFT_PRIMARY_LIGHT,
      dark: GFT_PRIMARY_DARK,
    },
    secondary: {
      main: GFT_ACCENT,
      light: GFT_ACCENT_LIGHT,
      dark: GFT_ACCENT_DARK,
    },
    success: {
      main: "#13DEB9",
      light: "#E6FFFA",
      dark: "#02b3a9",
      contrastText: "#ffffff",
    },
    info: {
      main: GFT_ACCENT,
      light: GFT_ACCENT_LIGHT,
      dark: GFT_ACCENT_DARK,
      contrastText: "#ffffff",
    },
    error: {
      main: "#FA896B",
      light: "#FDEDE8",
      dark: "#f3704d",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#FFAE1F",
      light: "#FEF5E5",
      dark: "#ae8e59",
      contrastText: "#ffffff",
    },
    grey: {
      100: "#F2F6FA",
      200: "#EAEFF4",
      300: "#DFE5EF",
      400: "#7C8FAC",
      500: "#5A6A85",
      600: "#2A3547",
    },
    text: {
      primary: "#2A3547",
      secondary: "#5A6A85",
    },
    action: {
      disabledBackground: "rgba(73,82,88,0.12)",
      hoverOpacity: 0.02,
      hover: "#f6f9fc",
    },
    divider: "#e5eaef",
    background: {
      default: "#f4f6f9",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: plus.style.fontFamily,
    h1: {
      fontWeight: 600,
      fontSize: "2.25rem",
      lineHeight: "2.75rem",
      fontFamily: plus.style.fontFamily,
    },
    h2: {
      fontWeight: 600,
      fontSize: "1.875rem",
      lineHeight: "2.25rem",
      fontFamily: plus.style.fontFamily,
    },
    h3: {
      fontWeight: 600,
      fontSize: "1.5rem",
      lineHeight: "1.75rem",
      fontFamily: plus.style.fontFamily,
    },
    h4: {
      fontWeight: 600,
      fontSize: "1.3125rem",
      lineHeight: "1.6rem",
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.125rem",
      lineHeight: "1.6rem",
    },
    h6: {
      fontWeight: 600,
      fontSize: "1rem",
      lineHeight: "1.2rem",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
    body1: {
      fontSize: "0.875rem",
      fontWeight: 400,
      lineHeight: "1.334rem",
    },
    body2: {
      fontSize: "0.75rem",
      letterSpacing: "0rem",
      fontWeight: 400,
      lineHeight: "1rem",
    },
    subtitle1: {
      fontSize: "0.875rem",
      fontWeight: 400,
    },
    subtitle2: {
      fontSize: "0.875rem",
      fontWeight: 400,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#f4f6f9",
        },
        ".MuiPaper-elevation9, .MuiPopover-root .MuiPaper-elevation": {
          boxShadow:
            "rgb(145 158 171 / 30%) 0px 0px 2px 0px, rgb(145 158 171 / 12%) 0px 12px 24px -4px !important",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        elevation0: {
          border: "1px solid #e5eaef",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
          border: "1px solid #e5eaef",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.06)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none",
          fontWeight: 600,
        },
        containedPrimary: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 8px 24px rgba(46, 79, 169, 0.35)",
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

export { baselightTheme };
