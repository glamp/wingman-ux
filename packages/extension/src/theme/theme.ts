import { createTheme } from '@mui/material/styles';

// Custom color palette from original design
export const colors = {
  primary: '#0084ff',
  primaryHover: '#0073e6',
  secondary: '#8b5cf6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  bgGlass: 'rgba(255, 255, 255, 0.8)',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  gradient: 'linear-gradient(135deg, #0084ff, #8b5cf6)',
  bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  meshGradient1: 'radial-gradient(circle at 25% 25%, rgba(0, 132, 255, 0.1) 0%, transparent 50%)',
  meshGradient2: 'radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
};

// Shadow definitions
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  glow: '0 8px 25px rgba(0, 132, 255, 0.4)',
};

// Border radius definitions
export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
};

// Create the MUI theme
export const wingmanTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      dark: colors.primaryHover,
    },
    secondary: {
      main: colors.secondary,
    },
    success: {
      main: colors.success,
    },
    error: {
      main: colors.error,
    },
    warning: {
      main: colors.warning,
    },
    background: {
      default: colors.bgPrimary,
      paper: colors.bgPrimary,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
    divider: colors.border,
  },
  typography: {
    fontFamily: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    h5: {
      fontSize: '24px',
      fontWeight: 600,
    },
    h6: {
      fontSize: '20px',
      fontWeight: 600,
    },
    subtitle1: {
      fontSize: '16px',
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '14px',
      fontWeight: 500,
      color: colors.textSecondary,
    },
    body1: {
      fontSize: '14px',
    },
    body2: {
      fontSize: '12px',
      color: colors.textMuted,
    },
    caption: {
      fontSize: '11px',
      color: colors.textMuted,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    shadows.sm,
    shadows.sm,
    shadows.md,
    shadows.md,
    shadows.md,
    shadows.md,
    shadows.lg,
    shadows.lg,
    shadows.lg,
    shadows.lg,
    shadows.lg,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.glow,
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: radius.md,
          fontWeight: 600,
          fontSize: '14px',
          padding: '10px 20px',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.02) translateY(-1px)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        containedPrimary: {
          background: colors.gradient,
          boxShadow: shadows.md,
          '&:hover': {
            background: colors.gradient,
            boxShadow: shadows.glow,
          },
        },
        outlined: {
          borderColor: colors.border,
          '&:hover': {
            borderColor: colors.primary,
            backgroundColor: 'rgba(0, 132, 255, 0.05)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: shadows.sm,
        },
        elevation2: {
          boxShadow: shadows.md,
        },
        elevation3: {
          boxShadow: shadows.lg,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minWidth: 0,
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '14px',
          '&.Mui-selected': {
            fontWeight: 600,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          fontWeight: 500,
          fontSize: '12px',
        },
        colorPrimary: {
          background: 'rgba(0, 132, 255, 0.1)',
          color: colors.primary,
        },
        colorSuccess: {
          background: 'rgba(16, 185, 129, 0.1)',
          color: colors.success,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: radius.md,
            '& fieldset': {
              borderColor: colors.border,
            },
            '&:hover fieldset': {
              borderColor: colors.primary,
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary,
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
        },
        standardSuccess: {
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: colors.success,
        },
        standardError: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: colors.error,
        },
        standardWarning: {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: colors.warning,
        },
        standardInfo: {
          backgroundColor: 'rgba(0, 132, 255, 0.1)',
          color: colors.primary,
        },
      },
    },
  },
});

// Glass morphism styles
export const glassStyles = {
  background: colors.bgGlass,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  boxShadow: shadows.md,
};

// Gradient text style
export const gradientTextStyle = {
  background: colors.gradient,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

// Dock container style (for tabs)
export const dockStyle = {
  ...glassStyles,
  display: 'flex',
  justifyContent: 'center',
  gap: '16px',
  padding: '12px',
  margin: '16px 0 20px 0',
};

// Animation keyframes
export const animations = `
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes glow {
    0% { box-shadow: 0 0 5px rgba(0, 132, 255, 0.5); }
    50% { box-shadow: 0 0 20px rgba(0, 132, 255, 0.8); }
    100% { box-shadow: 0 0 5px rgba(0, 132, 255, 0.5); }
  }
`;