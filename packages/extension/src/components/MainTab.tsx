import { ExtensionMessenger } from '@/lib/messaging';
import { useError, useIsLoading, usePopupStore } from '@/stores/popup-store';
import { useRelayUrl } from '@/stores/settings-store';
import { colors, glassStyles, radius, shadows } from '@/theme/theme';
import { Alert, Box, Button, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import React from 'react';

export const MainTab: React.FC = () => {
  const isLoading = useIsLoading();
  const error = useError();
  const { setLoading, setError, clearError, setLastAction } = usePopupStore();

  const relayUrl = useRelayUrl();

  const handleCaptureClick = async () => {
    clearError();
    setLoading(true);
    setLastAction('Capturing feedback...');

    try {
      // Activate the overlay in the current tab
      const activated = await ExtensionMessenger.activateOverlay();

      if (activated) {
        setLastAction('Overlay activated successfully!');
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
        return {
          label: '📋 Clipboard',
          icon: '📋',
          shortLabel: 'Clipboard',
          color: colors.primary,
          bgColor: 'rgba(0, 132, 255, 0.1)',
        };
      case 'http://localhost:8787':
        return {
          label: '💻 Local',
          icon: '💻',
          shortLabel: 'Local',
          color: colors.success,
          bgColor: 'rgba(16, 185, 129, 0.1)',
        };
      default:
        return {
          label: '🌐 Remote',
          icon: '🌐',
          shortLabel: 'Remote',
          color: colors.secondary,
          bgColor: 'rgba(139, 92, 246, 0.1)',
        };
    }
  };

  const mode = getModeDisplay();

  return (
    <Stack spacing={2}>
      {/* Combined Action and Instructions Card */}
      <Box
        sx={{
          ...glassStyles,
          p: 3,
          borderRadius: radius.lg,
        }}
      >
        <Stack spacing={2.5}>
          {/* Capture Button */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleCaptureClick}
            disabled={isLoading}
            sx={{
              height: 56,
              fontSize: '16px',
              fontWeight: 700,
              background: colors.gradient,
              borderRadius: radius.md,
              boxShadow: shadows.md,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              transition: 'all 0.3s ease',
              '&:hover': {
                background: colors.gradient,
                transform: 'scale(1.02) translateY(-2px)',
                boxShadow: shadows.glow,
              },
              '&:active': {
                transform: 'scale(0.98)',
              },
              '&.Mui-disabled': {
                background: colors.bgSecondary,
                color: colors.textMuted,
              },
            }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={20} sx={{ color: 'inherit' }} />
                <span>Activating...</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '20px' }}>🎯</span>
                <span>Capture Feedback</span>
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <Alert severity="error" onClose={clearError} sx={{ fontSize: '0.875rem' }}>
              {error}
            </Alert>
          )}

          {/* Divider */}
          <Divider sx={{ borderColor: colors.border, opacity: 0.5 }} />

          {/* Instructions */}
          <Stack spacing={1.5}>
            <Typography
              variant="body2"
              sx={{
                color: colors.textPrimary,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <span style={{ fontSize: '20px' }}>🚀</span>
              How it works
            </Typography>
            <Stack spacing={0.5}>
              <Typography
                variant="caption"
                sx={{
                  color: colors.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '12px',
                }}
              >
                <span style={{ fontSize: '14px' }}>1️⃣</span>
                Press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Shift+K or click{' '}
                <i>Capture Feedback</i> button
              </Typography>
              {[
                { step: '2️⃣', text: 'Select element' },
                { step: '3️⃣', text: 'Add your feedback' },
                { step: '4️⃣', text: 'Generate an AI-ready prompt' },
              ].map((item, index) => (
                <Typography
                  key={index}
                  variant="caption"
                  sx={{
                    color: colors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{item.step}</span>
                  {item.text}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
};
