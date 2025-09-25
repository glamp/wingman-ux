import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Alert,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import {
  useActiveTunnel,
  useTunnelStatus,
  useTunnelStore,
  useIsConnecting,
  useConnectionError
} from '@/stores/tunnel-store';

export const ShareTab: React.FC = () => {
  const activeTunnel = useActiveTunnel();
  const tunnelStatus = useTunnelStatus();
  const isConnecting = useIsConnecting();
  const connectionError = useConnectionError();
  const { createTunnel, stopTunnel } = useTunnelStore();

  const [targetPort, setTargetPort] = useState('');
  const [copied, setCopied] = useState(false);

  // Auto-detect port from current tab URL
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        try {
          const url = new URL(tabs[0].url);
          if (url.port) {
            setTargetPort(url.port);
          } else if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            // Common default ports if not specified
            setTargetPort(url.protocol === 'https:' ? '443' : '80');
          } else {
            // Fallback to common dev ports
            setTargetPort('3000');
          }
        } catch (e) {
          setTargetPort('3000');
        }
      }
    });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success' as const;
      case 'connecting': return 'warning' as const;
      case 'error': return 'error' as const;
      default: return 'default' as const;
    }
  };

  const handleStartTunnel = async () => {
    const port = parseInt(targetPort, 10);
    if (isNaN(port) || port <= 0 || port > 65535) {
      alert('Please enter a valid port number between 1 and 65535');
      return;
    }
    await createTunnel(port);
  };

  const handleStopTunnel = async () => {
    await stopTunnel();
  };

  const handleCopyUrl = () => {
    if (activeTunnel?.tunnelUrl) {
      navigator.clipboard.writeText(activeTunnel.tunnelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  return (
    <Stack spacing={2}>

      {/* Compact Tunnel Controls */}
      <Paper elevation={1} sx={{ p: 2 }}>
        {!activeTunnel ? (
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={tunnelStatus}
                color={getStatusColor(tunnelStatus)}
                size="small"
                sx={{ textTransform: 'capitalize' }}
              />
              <Typography variant="body2" color="text.secondary">
                Create tunnel
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <TextField
                placeholder="Port"
                value={targetPort}
                onChange={(e) => setTargetPort(e.target.value)}
                size="small"
                type="number"
                disabled={isConnecting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">:</InputAdornment>
                  ),
                }}
                sx={{ width: 150 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleStartTunnel}
                disabled={isConnecting || !targetPort}
                startIcon={isConnecting ? <CircularProgress size={16} /> : <PlayIcon />}
                fullWidth
              >
                {isConnecting ? 'Connecting' : 'Start'}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="Connected"
                color="success"
                size="small"
                icon={<Box component="span" sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  display: 'inline-block',
                  ml: 0.5
                }} />}
              />
              <Typography variant="caption" color="text.secondary">
                localhost:{activeTunnel.tunnelUrl?.match(/:([0-9]+)/)?.[1] || targetPort} · {getRelativeTime(activeTunnel.connectedAt)}
              </Typography>
            </Box>

            <Box sx={{
              p: 1,
              bgcolor: 'grey.50',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  flexGrow: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {activeTunnel.tunnelUrl || activeTunnel.publicUrl || 'Waiting...'}
              </Typography>
              <IconButton
                onClick={handleCopyUrl}
                size="small"
                color={copied ? 'success' : 'default'}
                sx={{ flexShrink: 0 }}
              >
                {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
              </IconButton>
            </Box>

            <Button
              variant="text"
              color="error"
              onClick={handleStopTunnel}
              startIcon={<StopIcon />}
              size="small"
              fullWidth
            >
              Stop Tunnel
            </Button>
          </Stack>
        )}
      </Paper>

      {/* Error Display */}
      {connectionError && (
        <Alert severity="error" sx={{ py: 1 }}>
          <Typography variant="body2">
            {connectionError}
          </Typography>
        </Alert>
      )}
    </Stack>
  );
};