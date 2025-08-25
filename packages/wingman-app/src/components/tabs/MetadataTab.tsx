import { Box, Typography, Table, TableBody, TableCell, TableRow, Paper } from '@mui/material';
import type { WingmanAnnotation } from '@wingman/shared';

interface MetadataTabProps {
  annotation: WingmanAnnotation;
}

function MetadataTab({ annotation }: MetadataTabProps) {
  const formatRect = (rect: typeof annotation.target.rect) => 
    `${rect.width}×${rect.height} at (${rect.x}, ${rect.y})`;

  const formatViewport = (viewport: typeof annotation.page.viewport) =>
    `${viewport.w}×${viewport.h} (DPR: ${viewport.dpr})`;

  return (
    <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1 }}>
      {/* Page Information */}
      <Paper sx={{ mb: 3, p: 2 }} elevation={0} variant="outlined">
        <Typography variant="h6" gutterBottom>
          Page Information
        </Typography>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', width: '120px' }}>
                URL
              </TableCell>
              <TableCell sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {annotation.page.url}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                Title
              </TableCell>
              <TableCell>{annotation.page.title}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                User Agent
              </TableCell>
              <TableCell sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {annotation.page.ua}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                Viewport
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>
                {formatViewport(annotation.page.viewport)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      {/* Target Information */}
      <Paper sx={{ mb: 3, p: 2 }} elevation={0} variant="outlined">
        <Typography variant="h6" gutterBottom>
          Target Information
        </Typography>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', width: '120px' }}>
                Mode
              </TableCell>
              <TableCell sx={{ textTransform: 'capitalize' }}>
                {annotation.target.mode}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                Rectangle
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>
                {formatRect(annotation.target.rect)}
              </TableCell>
            </TableRow>
            {annotation.target.selector && (
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  CSS Selector
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {annotation.target.selector}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Timing Information */}
      <Paper sx={{ p: 2 }} elevation={0} variant="outlined">
        <Typography variant="h6" gutterBottom>
          Timing Information
        </Typography>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', width: '120px' }}>
                Created At
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>
                {new Date(annotation.createdAt).toLocaleString()}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                ID
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>
                {annotation.id}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

export default MetadataTab;