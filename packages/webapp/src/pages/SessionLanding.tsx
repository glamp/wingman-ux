import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  CircularProgress,
  Alert,
  Chip,
  Grid
} from '@mui/material';
import { 
  CheckCircle, 
  Error as ErrorIcon, 
  HourglassEmpty,
  Flight
} from '@mui/icons-material';

interface SessionData {
  id: string;
  developerId: string;
  targetPort: number;
  status: 'pending' | 'active' | 'expired';
  createdAt: string;
  tunnelUrl?: string;
}

/**
 * Landing page for tunnel sessions - what PMs see when visiting a tunnel URL
 */
export default function SessionLanding() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    if (!sessionId) return;

    // Fetch initial session data
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Session not found. Please check the URL and try again.');
          } else {
            setError('Failed to load session information.');
          }
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        setSession(data.session);
        setLoading(false);
      } catch (err) {
        setError('Failed to connect to server.');
        setLoading(false);
      }
    };

    fetchSession();

    // Connect WebSocket for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      setWsStatus('connected');
      // Register as PM for this session
      ws.send(JSON.stringify({
        type: 'register',
        role: 'pm',
        sessionId: sessionId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'session_update') {
          setSession(message.session);
        } else if (message.type === 'developer-connected') {
          setSession(prev => prev ? { ...prev, status: 'active' } : null);
        } else if (message.type === 'developer-disconnected') {
          setSession(prev => prev ? { ...prev, status: 'pending' } : null);
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onerror = () => {
      setWsStatus('disconnected');
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Alert severity="error" sx={{ width: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Connection Error
            </Typography>
            {error}
          </Alert>
        </Box>
      </Container>
    );
  }

  const getStatusIcon = () => {
    switch (session?.status) {
      case 'active':
        return <CheckCircle sx={{ fontSize: 80, color: 'success.main' }} />;
      case 'expired':
        return <ErrorIcon sx={{ fontSize: 80, color: 'error.main' }} />;
      default:
        return <HourglassEmpty sx={{ fontSize: 80, color: 'warning.main' }} />;
    }
  };

  const getStatusMessage = () => {
    switch (session?.status) {
      case 'active':
        return 'Developer Connected';
      case 'expired':
        return 'Session Expired';
      default:
        return 'Waiting for Developer...';
    }
  };

  const getStatusColor = () => {
    switch (session?.status) {
      case 'active':
        return 'success';
      case 'expired':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: 4
    }}>
      <Container maxWidth="md">
        <Paper elevation={10} sx={{ p: 6, borderRadius: 3 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
              <Flight sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold' }}>
                {sessionId}
              </Typography>
            </Box>
            
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Wingman Tunnel Session
            </Typography>
          </Box>

          {/* Status */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            {getStatusIcon()}
            <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
              {getStatusMessage()}
            </Typography>
            
            <Chip 
              label={session?.status.toUpperCase()} 
              color={getStatusColor() as any}
              sx={{ mt: 1 }}
            />
          </Box>

          {/* Session Details */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Target Port
              </Typography>
              <Typography variant="h6">
                localhost:{session?.targetPort}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Developer ID
              </Typography>
              <Typography variant="h6">
                {session?.developerId}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body1">
                {session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'Unknown'}
              </Typography>
            </Grid>
          </Grid>

          {/* Instructions */}
          {session?.status === 'pending' && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Waiting for developer to connect...
              </Typography>
              <Typography variant="body2">
                The developer needs to run their local application on port {session?.targetPort} and connect to this tunnel session.
                Once connected, you'll be able to access their development server through this tunnel.
              </Typography>
            </Alert>
          )}

          {session?.status === 'active' && (
            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Connection established!
              </Typography>
              <Typography variant="body2">
                The developer's local server on port {session?.targetPort} is now accessible through this tunnel.
                You can interact with their application in real-time.
              </Typography>
            </Alert>
          )}

          {session?.status === 'expired' && (
            <Alert severity="error" sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Session has expired
              </Typography>
              <Typography variant="body2">
                This tunnel session has expired after 24 hours. 
                Please ask the developer to create a new tunnel session.
              </Typography>
            </Alert>
          )}

          {/* WebSocket Status */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Connection Status: {' '}
              <Chip 
                label={wsStatus} 
                size="small"
                color={wsStatus === 'connected' ? 'success' : wsStatus === 'connecting' ? 'warning' : 'error'}
              />
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}