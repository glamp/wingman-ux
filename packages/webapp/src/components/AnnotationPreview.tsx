import { Container, Grid, Paper, Typography, Box, Chip } from '@mui/material';
import type { StoredAnnotation } from '@wingman/shared';
import ScreenshotViewer from './ScreenshotViewer';
import TabbedInterface from './TabbedInterface';
import ClaudeCopyButton from './ClaudeCopyButton';
import { getRelativeTime } from '../utils/dateFormatter';

interface AnnotationPreviewProps {
  annotation: StoredAnnotation;
}

function AnnotationPreview({ annotation }: AnnotationPreviewProps) {
  const { annotation: data } = annotation;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <Paper sx={{ p: 3, mb: 3 }} elevation={1}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box 
                component="img" 
                src="/wingman.png" 
                alt="Wingman"
                sx={{ width: 40, height: 40 }}
              />
              <Typography variant="h4" component="h1">
                Annotation Preview
              </Typography>
            </Box>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {data.page.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {data.page.url}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip 
                label={`ID: ${data.id}`} 
                size="small" 
                variant="outlined" 
              />
              <Chip 
                label={`Target: ${data.target.mode}`} 
                size="small" 
                variant="outlined" 
              />
              <Chip 
                label={`Created: ${getRelativeTime(data.createdAt)}`} 
                size="small" 
                variant="outlined" 
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <ClaudeCopyButton annotation={annotation} />
            </Box>
          </Grid>
        </Grid>

        {/* User Note */}
        {data.note && (
          <Paper sx={{ p: 2, mt: 2, backgroundColor: 'action.hover' }} elevation={0}>
            <Typography variant="subtitle2" gutterBottom>
              Annotation Note:
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {data.note}
            </Typography>
          </Paper>
        )}
      </Paper>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Screenshot Section */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 0 }} elevation={1}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Screenshot</Typography>
              <Typography variant="body2" color="text.secondary">
                Target highlighted: {data.target.rect.width}×{data.target.rect.height} at ({data.target.rect.x}, {data.target.rect.y})
              </Typography>
            </Box>
            <Box sx={{ p: 1 }}>
              <ScreenshotViewer annotation={data} />
            </Box>
          </Paper>
        </Grid>

        {/* Tabbed Data Section */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} elevation={1}>
            <TabbedInterface annotation={data} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default AnnotationPreview;