import { Box, Typography, Table, TableBody, TableCell, TableRow, Paper, Chip } from '@mui/material';
import { Code as ReactIcon } from '@mui/icons-material';
import type { WingmanAnnotation } from '@wingman/shared';

interface ReactTabProps {
  reactData?: WingmanAnnotation['react'];
}

function ReactTab({ reactData }: ReactTabProps) {
  if (!reactData) {
    return (
      <Box sx={{ 
        p: 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.secondary',
        height: '200px'
      }}>
        <ReactIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" gutterBottom>
          No React Component Data
        </Typography>
        <Typography variant="body2" align="center">
          React component information was not captured for this annotation.
          This could mean the element is not a React component or the React DevTools hook was not available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1 }}>
      {/* Component Overview */}
      <Paper sx={{ mb: 3, p: 2 }} elevation={0} variant="outlined">
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReactIcon />
          Component Information
        </Typography>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', width: '120px' }}>
                Component
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>
                {reactData.componentName || 'Unknown'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                Data Source
              </TableCell>
              <TableCell>
                <Chip 
                  label={reactData.obtainedVia === 'devtools-hook' ? 'React DevTools' : 'None Available'}
                  color={reactData.obtainedVia === 'devtools-hook' ? 'success' : 'warning'}
                  size="small"
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      {/* Component Props */}
      {reactData.props && (
        <Paper sx={{ mb: 3, p: 2 }} elevation={0} variant="outlined">
          <Typography variant="h6" gutterBottom>
            Props
          </Typography>
          <Box sx={{ 
            backgroundColor: 'grey.50', 
            borderRadius: 1, 
            p: 2,
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            <pre style={{ 
              margin: 0, 
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.4
            }}>
              {JSON.stringify(reactData.props, null, 2)}
            </pre>
          </Box>
        </Paper>
      )}

      {/* Component State */}
      {reactData.state && (
        <Paper sx={{ mb: 3, p: 2 }} elevation={0} variant="outlined">
          <Typography variant="h6" gutterBottom>
            State
          </Typography>
          <Box sx={{ 
            backgroundColor: 'grey.50', 
            borderRadius: 1, 
            p: 2,
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            <pre style={{ 
              margin: 0, 
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.4
            }}>
              {JSON.stringify(reactData.state, null, 2)}
            </pre>
          </Box>
        </Paper>
      )}

      {/* Help Text */}
      {reactData.obtainedVia !== 'devtools-hook' && (
        <Paper sx={{ p: 2, backgroundColor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }} elevation={0}>
          <Typography variant="body2" color="warning.dark">
            <strong>Note:</strong> React component data was not fully captured. 
            For better React integration, ensure the React DevTools browser extension is installed 
            and the page has React development mode enabled.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

export default ReactTab;