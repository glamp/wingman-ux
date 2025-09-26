import React, { useEffect } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Typography,
  Paper,
  GlobalStyles,
  Chip
} from '@mui/material';
import { TabNavigation } from '@/components/TabNavigation';
import { MainTab } from '@/components/MainTab';
import { ShareTab } from '@/components/ShareTab';
import { SettingsTab } from '@/components/SettingsTab';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useActiveTab } from '@/stores/popup-store';
import { useRelayUrl } from '@/stores/settings-store';
import { wingmanTheme, colors, gradientTextStyle, animations } from '@/theme/theme';
import '@/stores'; // Initialize stores
import '@/assets/fonts/geist.css'; // Import Geist font

const App: React.FC = () => {
  const activeTab = useActiveTab();
  const relayUrl = useRelayUrl();

  const getModeDisplay = () => {
    switch (relayUrl) {
      case 'clipboard':
        return {
          label: '📋 Clipboard',
          icon: '📋',
          shortLabel: 'Clipboard',
          color: '#ffffff',
          bgColor: colors.primary
        };
      case 'http://localhost:8787':
        return {
          label: '💻 Local',
          icon: '💻',
          shortLabel: 'Local',
          color: '#ffffff',
          bgColor: colors.success
        };
      default:
        return {
          label: '🌐 Remote',
          icon: '🌐',
          shortLabel: 'Remote',
          color: '#ffffff',
          bgColor: colors.secondary
        };
    }
  };

  const mode = getModeDisplay();

  // Load settings on mount
  useEffect(() => {
    import('@/stores/settings-store').then(({ useSettingsStore }) => {
      useSettingsStore.getState().loadSettings();
    });
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'main':
        return <MainTab />;
      case 'live-share':
        return <ShareTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <MainTab />;
    }
  };

  return (
    <ErrorBoundary>
      <ThemeProvider theme={wingmanTheme}>
        <CssBaseline />
        <GlobalStyles
        styles={{
          ...animations,
          'html, body': {
            margin: 0,
            padding: 0,
            overflow: 'hidden',
          },
        }}
      />
      <Box
        sx={{
          width: 420,
          minHeight: 500,
          background: colors.bgGradient,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '12px',
        }}
      >
        {/* Background mesh gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `${colors.meshGradient1}, ${colors.meshGradient2}`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Main content */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <Box sx={{ p: 2, pb: 1, textAlign: 'center' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mb: 0.5,
              }}
            >
              <Box
                component="img"
                src="icons/logo.png"
                alt="Wingman"
                sx={{
                  width: 40,
                  height: 40,
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.1) rotate(5deg)',
                  },
                }}
              />
              <Typography
                variant="h5"
                component="h1"
                sx={gradientTextStyle}
              >
                Wingman
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: colors.textMuted, fontWeight: 500 }}>
              ✈️ UX Feedback Assistant
            </Typography>
          </Box>

          {/* Tab Navigation */}
          <TabNavigation />

          {/* Tab Content */}
          <Box sx={{ p: 2, pt: 0 }}>
            {renderTabContent()}
          </Box>
        </Box>
      </Box>

      {/* Mode Chip - Absolute positioned in frame corner */}
      <Chip
        label={mode.label}
        size="small"
        sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          fontWeight: 600,
          fontSize: '11px',
          height: 26,
          backgroundColor: mode.bgColor,
          color: mode.color,
          border: 'none',
          zIndex: 10,
          '& .MuiChip-label': {
            px: 1.5,
          },
        }}
      />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;