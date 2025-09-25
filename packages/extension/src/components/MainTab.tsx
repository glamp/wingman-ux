import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useIsLoading, useError, usePopupStore } from '@/stores/popup-store';
import { useRelayUrl } from '@/stores/settings-store';
import { ExtensionMessenger } from '@/lib/messaging';

export const MainTab: React.FC = () => {
  const isLoading = useIsLoading();
  const error = useError();
  const relayUrl = useRelayUrl();
  const { setLoading, setError, clearError, setLastAction } = usePopupStore();

  const [lastCaptureTime, setLastCaptureTime] = useState<Date | null>(null);

  const handleCaptureClick = async () => {
    clearError();
    setLoading(true);
    setLastAction('Capturing feedback...');

    try {
      // Activate the overlay in the current tab
      const activated = await ExtensionMessenger.activateOverlay();

      if (activated) {
        setLastAction('Overlay activated successfully!');
        setLastCaptureTime(new Date());
      } else {
        throw new Error('Failed to activate overlay. Make sure you have an active tab.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setLastAction(null);
    } finally {
      setLoading(false);
    }
  };

  const getModeDisplay = () => {
    switch (relayUrl) {
      case 'clipboard':
        return { label: '📋 Clipboard', icon: '📋', shortLabel: 'Clipboard', color: 'info' as const };
      case 'http://localhost:8787':
        return { label: '💻 Local', icon: '💻', shortLabel: 'Local', color: 'success' as const };
      default:
        return { label: '🌐 Remote', icon: '🌐', shortLabel: 'Remote', color: 'primary' as const };
    }
  };

  const mode = getModeDisplay();

  return (
    <Box sx={{ position: 'relative', height: '100%' }}>
      <Stack spacing={3}>
        {/* Main Action */}
        <Paper elevation={1} sx={{ p: 3 }}>
          <Stack spacing={2} alignItems="center">
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleCaptureClick}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <CameraIcon />}
            sx={{ py: 1.5 }}
          >
            {isLoading ? 'Activating...' : 'Capture Feedback'}
          </Button>

          {/* Last Capture Info */}
          {lastCaptureTime && !error && (
            <Box sx={{ textAlign: 'center' }}>
              <CheckIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="caption" color="success.main">
                Last capture: {lastCaptureTime.toLocaleTimeString()}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert
          severity="error"
          onClose={clearError}
          sx={{ fontSize: '0.875rem' }}
        >
          {error}
        </Alert>
      )}

      {/* Instructions */}
      <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="body2" color="text.secondary">
          <strong>How it works:</strong>
          <br />
          1. Click "Capture Feedback" or press ⌘⇧K
          <br />
          2. Select an element or area on the page
          <br />
          3. Add your feedback note
          <br />
          4. Submit to {mode.label.toLowerCase()}
        </Typography>
      </Paper>
    </Stack>

      {/* Subtle Output Mode Indicator */}
      <Chip
        label={mode.label}
        size="small"
        sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          opacity: 0.8,
          fontSize: '0.75rem',
          height: 24,
          '& .MuiChip-label': {
            px: 1,
          },
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      />
    </Box>
  );
};