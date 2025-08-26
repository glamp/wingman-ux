import { createTheme } from '@mui/material/styles';

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
      main: '#0084ff',
      dark: '#0073e6',
      light: 'rgba(0, 132, 255, 0.1)',
    },
    secondary: {
      main: '#8b5cf6',
      dark: '#7c3aed',
      light: 'rgba(139, 92, 246, 0.1)',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #0084ff, #8b5cf6)',
      primaryHover: 'linear-gradient(135deg, #0073e6, #7c3aed)',
    },
    background: {
      default: '#ffffff',
      paper: '#f8fafc',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      disabled: '#94a3b8',
    },
    divider: '#e2e8f0',
    success: {
      main: '#10b981',
    },
    error: {
      main: '#ef4444',
    },
    warning: {
      main: '#f59e0b',
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
          backgroundColor: '#f8fafc',
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