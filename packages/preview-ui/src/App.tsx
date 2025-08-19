import { useState, useEffect } from 'react';
import { Container, Box, CircularProgress, Alert, Typography } from '@mui/material';
import type { StoredAnnotation } from '@wingman/shared';
import AnnotationPreview from './components/AnnotationPreview';

function App() {
  const [annotation, setAnnotation] = useState<StoredAnnotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnnotation = async () => {
      try {
        // Get annotation ID from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');

        if (!id) {
          setError('No annotation ID provided in URL');
          setLoading(false);
          return;
        }

        // Fetch annotation data from the API
        const response = await fetch(`/annotations/${id}/preview-data`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError(`Annotation with ID "${id}" not found`);
          } else {
            setError(`Failed to load annotation: ${response.statusText}`);
          }
          setLoading(false);
          return;
        }

        const annotation: StoredAnnotation = await response.json();
        setAnnotation(annotation);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load annotation');
      } finally {
        setLoading(false);
      }
    };

    loadAnnotation();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Loading annotation...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!annotation) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Annotation not found
        </Alert>
      </Container>
    );
  }

  return <AnnotationPreview annotation={annotation} />;
}

export default App;