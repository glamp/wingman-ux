import React from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Typography,
  Button,
  Paper,
  Stack
} from '@mui/material';

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
  },
});

const App: React.FC = () => {
  const handleCaptureClick = () => {
    console.log('Capture button clicked');
    // TODO: Connect to Zustand store
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: 420, minHeight: 300, p: 2 }}>
        <Paper elevation={0} sx={{ p: 2 }}>
          <Stack spacing={2}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h6" component="h1" gutterBottom>
                Wingman
              </Typography>
              <Typography variant="body2" color="text.secondary">
                UX Feedback Assistant
              </Typography>
            </Box>

            {/* Main Action */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleCaptureClick}
              sx={{ py: 1.5 }}
            >
              Capture Feedback
            </Button>

            {/* Status */}
            <Typography variant="body2" color="text.secondary" align="center">
              WXT + MUI + Zustand Migration - Phase 1 ✅
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default App;