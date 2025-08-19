import { 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Typography,
  Paper
} from '@mui/material';
import type { WingmanAnnotation } from '@wingman/shared';

interface NetworkTabProps {
  requests: WingmanAnnotation['network'];
}

function NetworkTab({ requests }: NetworkTabProps) {
  const getStatusColor = (status?: number) => {
    if (!status) return 'default';
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'info';
    if (status >= 400 && status < 500) return 'warning';
    if (status >= 500) return 'error';
    return 'default';
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${Math.round(duration)}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return {
        pathname: urlObj.pathname,
        origin: urlObj.origin,
        search: urlObj.search
      };
    } catch {
      return {
        pathname: url,
        origin: '',
        search: ''
      };
    }
  };

  const formatTimestamp = (startTime?: number) => {
    if (!startTime) return 'N/A';
    return new Date(startTime).toLocaleTimeString();
  };

  if (requests.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No network requests captured
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <TableContainer>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>URL</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Duration</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request, index) => {
              const urlParts = formatUrl(request.url);
              return (
                <TableRow key={index} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell>
                    <Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          color: 'primary.main'
                        }}
                      >
                        {urlParts.pathname}
                      </Typography>
                      {urlParts.search && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontFamily: 'monospace',
                            color: 'text.secondary',
                            display: 'block'
                          }}
                        >
                          {urlParts.search}
                        </Typography>
                      )}
                      {urlParts.origin && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary',
                            display: 'block'
                          }}
                        >
                          {urlParts.origin}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {request.status ? (
                      <Chip 
                        label={request.status} 
                        size="small" 
                        color={getStatusColor(request.status)}
                        variant={getStatusColor(request.status) === 'default' ? 'outlined' : 'filled'}
                        sx={{ 
                          minWidth: '50px',
                          fontFamily: 'monospace',
                          fontWeight: 'bold'
                        }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Pending
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
                        color: request.duration && request.duration > 1000 ? 'warning.main' : 'text.primary'
                      }}
                    >
                      {formatDuration(request.duration)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={request.initiatorType || 'unknown'} 
                      size="small" 
                      variant="outlined"
                      sx={{ 
                        textTransform: 'uppercase',
                        fontSize: '0.7rem'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontFamily: 'monospace',
                        color: 'text.secondary'
                      }}
                    >
                      {formatTimestamp(request.startTime)}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      <Paper sx={{ m: 2, p: 2, backgroundColor: 'action.hover' }} elevation={0}>
        <Typography variant="subtitle2" gutterBottom>
          Network Summary
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2">
            <strong>Total Requests:</strong> {requests.length}
          </Typography>
          <Typography variant="body2">
            <strong>With Status:</strong> {requests.filter(r => r.status).length}
          </Typography>
          <Typography variant="body2">
            <strong>Failed (4xx/5xx):</strong> {requests.filter(r => r.status && r.status >= 400).length}
          </Typography>
          <Typography variant="body2">
            <strong>Slow (&gt;1s):</strong> {requests.filter(r => r.duration && r.duration > 1000).length}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default NetworkTab;