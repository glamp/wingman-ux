import React, { useState } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  Typography, 
  Chip, 
  ToggleButton, 
  ToggleButtonGroup, 
  Paper,
  Stack 
} from '@mui/material';
import { 
  Info as InfoIcon, 
  Warning as WarningIcon, 
  Error as ErrorIcon,
  BugReport as LogIcon
} from '@mui/icons-material';
import type { WingmanAnnotation } from '@wingman/shared';

type LogLevel = 'all' | 'log' | 'info' | 'warn' | 'error';

interface ConsoleTabProps {
  logs: WingmanAnnotation['console'];
}

function ConsoleTab({ logs }: ConsoleTabProps) {
  const [filter, setFilter] = useState<LogLevel>('all');

  const handleFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: LogLevel | null) => {
    if (newFilter !== null) {
      setFilter(newFilter);
    }
  };

  const filteredLogs = logs.filter(log => filter === 'all' || log.level === filter);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error': return <ErrorIcon sx={{ fontSize: '16px', color: 'error.main' }} />;
      case 'warn': return <WarningIcon sx={{ fontSize: '16px', color: 'warning.main' }} />;
      case 'info': return <InfoIcon sx={{ fontSize: '16px', color: 'info.main' }} />;
      case 'log': 
      default: return <LogIcon sx={{ fontSize: '16px', color: 'text.secondary' }} />;
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error': return 'error.main';
      case 'warn': return 'warning.main'; 
      case 'info': return 'info.main';
      case 'log':
      default: return 'text.primary';
    }
  };

  const formatLogArgs = (args: any[]) => {
    return args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg, null, 2);
      }
      return String(arg);
    }).join(' ');
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString();
  };

  const levelCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filter Controls */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle2">
            Filter:
          </Typography>
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={handleFilterChange}
            size="small"
          >
            <ToggleButton value="all">
              All ({logs.length})
            </ToggleButton>
            <ToggleButton value="log">
              Log ({levelCounts.log || 0})
            </ToggleButton>
            <ToggleButton value="info">
              Info ({levelCounts.info || 0})
            </ToggleButton>
            <ToggleButton value="warn">
              Warn ({levelCounts.warn || 0})
            </ToggleButton>
            <ToggleButton value="error">
              Error ({levelCounts.error || 0})
            </ToggleButton>
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
                  py: 1.5
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 1 }}>
                  {/* Level Icon */}
                  <Box sx={{ mt: 0.5, flexShrink: 0 }}>
                    {getLogIcon(log.level)}
                  </Box>

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
                          color: getLogColor(log.level)
                        }}
                      />
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {formatTimestamp(log.ts)}
                      </Typography>
                    </Box>
                    
                    <Paper 
                      sx={{ 
                        p: 1, 
                        backgroundColor: 'action.hover',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: getLogColor(log.level)
                      }}
                      elevation={0}
                    >
                      {formatLogArgs(log.args)}
                    </Paper>
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}

export default ConsoleTab;