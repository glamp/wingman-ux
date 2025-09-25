import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Alert
} from '@mui/material';
import {
  Construction as ConstructionIcon
} from '@mui/icons-material';
import { useActiveTunnel, useTunnelStatus } from '@/stores/tunnel-store';

export const ShareTab: React.FC = () => {
  const activeTunnel = useActiveTunnel();
  const tunnelStatus = useTunnelStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success' as const;
      case 'connecting': return 'warning' as const;
      case 'error': return 'error' as const;
      default: return 'default' as const;
    }
  };

  return (
    <Stack spacing={3}>
      {/* Current Status */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Stack spacing={2} alignItems="center">
          <Chip
            label={`Status: ${tunnelStatus}`}
            color={getStatusColor(tunnelStatus)}
            size="small"
          />

          {activeTunnel ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" gutterBottom>
                Active Tunnel
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Session: {activeTunnel.sessionId}
                <br />
                Connected: {new Date(activeTunnel.connectedAt).toLocaleString()}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No active tunnel
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Coming Soon Notice */}
      <Alert
        icon={<ConstructionIcon fontSize="inherit" />}
        severity="info"
      >
        <Typography variant="body2">
          <strong>Live sharing features coming soon!</strong>
          <br />
          This will include tunnel management, shareable links, and real-time collaboration.
        </Typography>
      </Alert>

      {/* Phase Info */}
      <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Phase 2 Complete:</strong> State management with Zustand
          <br />
          <strong>Phase 4 Coming:</strong> Full tunnel/sharing functionality
        </Typography>
      </Paper>
    </Stack>
  );
};