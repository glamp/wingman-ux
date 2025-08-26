import { ArrowBack, Search, Visibility } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { StoredAnnotation } from '@wingman/shared';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnnotationPreview from '../components/AnnotationPreview';
import WhiteCard from '../components/WhiteCard';
import { apiFetch } from '../config/api';

interface AnnotationListItem {
  id: string;
  receivedAt: string;
  annotation: {
    id: string;
    url: string;
    comment: string;
    timestamp: string;
    type?: string;
    element?: {
      selector: string;
      text: string;
    };
  };
}

/**
 * Page for viewing annotations - either list view or individual annotation
 */
export default function AnnotationPreviewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [annotation, setAnnotation] = useState<StoredAnnotation | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const annotationId = searchParams.get('id');
  const isListView = !annotationId;

  useEffect(() => {
    if (isListView) {
      loadAnnotationsList();
    } else {
      loadSingleAnnotation();
    }
  }, [annotationId]);

  const loadAnnotationsList = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('annotations?limit=50');

      if (!response.ok) {
        throw new Error(`Failed to load annotations: ${response.statusText}`);
      }

      const data = await response.json();
      setAnnotations(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load annotations');
    } finally {
      setLoading(false);
    }
  };

  const loadSingleAnnotation = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`annotations/${annotationId}/preview-data`);

      if (!response.ok) {
        if (response.status === 404) {
          setError(`Annotation with ID "${annotationId}" not found`);
        } else {
          setError(`Failed to load annotation: ${response.statusText}`);
        }
        return;
      }

      const annotationData: StoredAnnotation = await response.json();
      setAnnotation(annotationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load annotation');
    } finally {
      setLoading(false);
    }
  };

  const filteredAnnotations = annotations.filter(
    (annotation) =>
      (annotation.annotation?.comment || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (annotation.annotation?.url || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>
              {isListView ? 'Error Loading Annotations' : 'Error Loading Annotation'}
            </Typography>
            {error}
          </Alert>
          {!isListView && (
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/annotations')}
              sx={{ mt: 2 }}
            >
              Back to Annotations
            </Button>
          )}
        </Box>
      </Container>
    );
  }

  // Single annotation view
  if (!isListView && annotation) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/annotations')} sx={{ mb: 2 }}>
          Back to Annotations
        </Button>
        <AnnotationPreview annotation={annotation} />
      </Container>
    );
  }

  // List view
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <WhiteCard sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            placeholder="Search annotations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: '300px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="body1" color="text.secondary">
            {filteredAnnotations.length} annotation{filteredAnnotations.length !== 1 ? 's' : ''}{' '}
            found
          </Typography>
        </Box>
      </WhiteCard>

      {filteredAnnotations.length === 0 ? (
        <WhiteCard sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {searchQuery ? 'No matching annotations found' : 'No annotations yet'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Annotations will appear here when captured with the Chrome extension'}
          </Typography>
          {searchQuery && (
            <Button onClick={() => setSearchQuery('')} sx={{ mt: 2 }}>
              Clear Search
            </Button>
          )}
        </WhiteCard>
      ) : (
        <TableContainer component={WhiteCard}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Note</TableCell>
                <TableCell>Page</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAnnotations.map((annotation) => (
                <TableRow key={annotation.id} hover>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {annotation.annotation?.comment || 'No comment'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                        {annotation.annotation?.url || 'No URL'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {annotation.annotation?.element?.text || 'No element'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={annotation.annotation?.type || 'click'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(annotation.receivedAt)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      startIcon={<Visibility />}
                      size="small"
                      onClick={() => navigate(`/annotations?id=${annotation.id}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
