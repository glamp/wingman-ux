import React, { useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Typography,
  Paper
} from '@mui/material';
import { TabNavigation } from '@/components/TabNavigation';
import { MainTab } from '@/components/MainTab';
import { ShareTab } from '@/components/ShareTab';
import { SettingsTab } from '@/components/SettingsTab';
import { useActiveTab } from '@/stores/popup-store';
import '@/stores'; // Initialize stores

// Create MUI theme for the extension
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0084ff',
    },
    secondary: {
      main: '#10b981',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },
  },
});

const App: React.FC = () => {
  const activeTab = useActiveTab();

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: 420, minHeight: 400 }}>
        {/* Header */}
        <Paper elevation={0} sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" component="h1" gutterBottom>
            Wingman
          </Typography>
          <Typography variant="body2" color="text.secondary">
            UX Feedback Assistant
          </Typography>
        </Paper>

        {/* Tab Navigation */}
        <TabNavigation />

        {/* Tab Content */}
        <Box sx={{ p: 2 }}>
          {renderTabContent()}
        </Box>

        {/* Phase Status */}
        <Box sx={{ p: 1, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="success.main">
            Phase 2 Complete: Zustand State Management ✅
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;