import { createTheme } from '@mui/material/styles';
import { colors } from './styles/theme';

// Extend the theme to include custom colors
declare module '@mui/material/styles' {
  interface Palette {
    gradient: {
      primary: string;
      primaryHover: string;
    };
  }
  interface PaletteOptions {
    gradient?: {
      primary: string;
      primaryHover: string;
    };
  }
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      dark: colors.primaryHover,
      light: 'rgba(0, 132, 255, 0.1)',
    },
    secondary: {
      main: colors.purple,
      dark: colors.purpleHover,
      light: 'rgba(139, 92, 246, 0.1)',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #0084ff, #8b5cf6)',
      primaryHover: 'linear-gradient(135deg, #0073e6, #7c3aed)',
    },
    background: {
      default: colors.bgPrimary,
      paper: colors.bgPrimary,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
      disabled: colors.textMuted,
    },
    divider: colors.borderColor,
    success: {
      main: colors.success,
      dark: colors.successHover,
    },
    error: {
      main: colors.error,
      dark: colors.errorHover,
    },
    warning: {
      main: colors.warning,
      dark: colors.warningHover,
    },
    info: {
      main: colors.info,
      dark: colors.infoHover,
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
  components: {
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: '40px',
          borderBottom: '1px solid #e2e8f0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: '40px',
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 400,
          padding: '8px 16px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: colors.bgPrimary,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          background: 'linear-gradient(135deg, #0084ff, #8b5cf6)',
          '&:hover': {
            background: 'linear-gradient(135deg, #0073e6, #7c3aed)',
          },
        },
        outlinedPrimary: {
          borderColor: '#e2e8f0',
          '&:hover': {
            borderColor: '#0084ff',
            backgroundColor: 'rgba(0, 132, 255, 0.05)',
          },
        },
      },
    },
  },
});