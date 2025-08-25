import {
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  List,
  ListItem,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  IconButton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import type { WingmanAnnotation } from '@wingman/shared';
import React, { useState } from 'react';
import { Inspector } from 'react-inspector';

type LogLevel = 'all' | 'log' | 'info' | 'warn' | 'error';

interface ConsoleTabProps {
  logs: WingmanAnnotation['console'];
}

function ConsoleTab({ logs }: ConsoleTabProps) {
  const [filter, setFilter] = useState<LogLevel>('all');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newFilter: LogLevel | null
  ) => {
    if (newFilter !== null) {
      setFilter(newFilter);
    }
  };

  const handleCopyJson = async (args: any[]) => {
    try {
      const jsonStr = JSON.stringify(args.length === 1 ? args[0] : args, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      setSnackbarMessage('JSON copied to clipboard');
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage('Failed to copy JSON');
      setSnackbarOpen(true);
    }
  };

  const hasJsonContent = (args: any[]) => {
    return args.some(arg => 
      typeof arg === 'object' && 
      arg !== null && 
      !(arg instanceof Date)
    );
  };

  const filteredLogs = logs.filter((log) => filter === 'all' || log.level === filter);


  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'error.main';
      case 'warn':
        return 'warning.main';
      case 'info':
        return 'info.main';
      case 'log':
      default:
        return 'text.primary';
    }
  };

  const renderLogArg = (arg: any, index: number, args: any[]) => {
    // For primitive values, just render as text
    if (
      typeof arg === 'string' ||
      typeof arg === 'number' ||
      typeof arg === 'boolean' ||
      arg === null ||
      arg === undefined
    ) {
      return (
        <Typography
          key={index}
          component="span"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {String(arg)}
          {index < args.length - 1 ? ' ' : ''}
        </Typography>
      );
    }
    
    // For objects and arrays, use the Inspector
    return (
      <Box key={index} sx={{ my: 0.5 }}>
        <Inspector
          data={arg}
          theme="chromeLight"
          expandLevel={1}
        />
      </Box>
    );
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString();
  };

  const levelCounts = logs.reduce(
    (acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filter Controls */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle2">Filter:</Typography>
          <ToggleButtonGroup value={filter} exclusive onChange={handleFilterChange} size="small">
            <ToggleButton value="all">All ({logs.length})</ToggleButton>
            <ToggleButton value="log">Log ({levelCounts.log || 0})</ToggleButton>
            <ToggleButton value="info">Info ({levelCounts.info || 0})</ToggleButton>
            <ToggleButton value="warn">Warn ({levelCounts.warn || 0})</ToggleButton>
            <ToggleButton value="error">Error ({levelCounts.error || 0})</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {/* Console Logs */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {filteredLogs.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {logs.length === 0 ? 'No console logs captured' : `No ${filter} logs found`}
            </Typography>
          </Box>
        ) : (
          <List dense>
            {filteredLogs.map((log, index) => (
              <ListItem
                key={index}
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  alignItems: 'flex-start',
                  py: 1.5,
                  backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.02)',
                  borderLeft: 4,
                  borderLeftColor: getLogColor(log.level),
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                  {/* Log Content */}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        label={log.level.toUpperCase()}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: '0.7rem',
                          height: '20px',
                          borderColor: getLogColor(log.level),
                          color: getLogColor(log.level),
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {formatTimestamp(log.ts)}
                      </Typography>
                      {hasJsonContent(log.args) && (
                        <Tooltip title="Copy as JSON">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyJson(log.args)}
                            sx={{
                              ml: 'auto',
                              opacity: 0.7,
                              '&:hover': { opacity: 1 },
                            }}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    <Box
                      sx={{
                        p: 1,
                        backgroundColor: 'transparent',
                        color: getLogColor(log.level),
                      }}
                    >
                      {log.args.map((arg, argIndex) => renderLogArg(arg, argIndex, log.args))}
                    </Box>
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
      
      {/* Snackbar for copy feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

export default ConsoleTab;
