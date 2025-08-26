import { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Alert,
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { 
  Refresh, 
  Delete, 
  Add,
  ContentCopy,
  Launch
} from '@mui/icons-material';

interface Session {
  id: string;
  tunnelUrl?: string;
  targetPort: number;
  createdAt: string;
  status: 'pending' | 'active' | 'inactive';
  developerId: string;
}

/**
 * Dashboard for managing tunnel sessions
 */
export default function TunnelDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [targetPort, setTargetPort] = useState('3000');
  const [copied, setCopied] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // Refresh every 10 seconds
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          developerId: 'webapp-user',
          targetPort: parseInt(targetPort),
          metadata: {
            createdFrom: 'webapp-dashboard'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      setCreateDialogOpen(false);
      fetchSessions();
      
      // Copy URL to clipboard
      if (data.tunnelUrl) {
        await navigator.clipboard.writeText(data.tunnelUrl);
        setCopied(data.sessionId);
        setTimeout(() => setCopied(null), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const handleCopyUrl = async (session: Session) => {
    try {
      if (session.tunnelUrl) {
        await navigator.clipboard.writeText(session.tunnelUrl);
        setCopied(session.id);
        setTimeout(() => setCopied(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Tunnel Sessions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
              onClick={fetchSessions}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Session
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Session ID</TableCell>
                  <TableCell>Tunnel URL</TableCell>
                  <TableCell>Target Port</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {loading ? 'Loading sessions...' : 'No active sessions. Create one to get started.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {session.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontFamily: 'monospace',
                              fontSize: '0.875rem'
                            }}
                          >
                            {session.tunnelUrl || 'No tunnel URL'}
                          </Typography>
                          {session.tunnelUrl && (
                            <IconButton 
                              size="small" 
                              onClick={() => handleCopyUrl(session)}
                              title="Copy URL"
                            >
                              {copied === session.id ? <span>✓</span> : <ContentCopy />}
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={`localhost:${session.targetPort}`} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={session.status}
                          size="small"
                          color={session.status === 'active' ? 'success' : session.status === 'pending' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(session.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {session.tunnelUrl && (
                            <IconButton 
                              size="small"
                              onClick={() => window.open(session.tunnelUrl, '_blank')}
                              title="Open tunnel"
                            >
                              <Launch />
                            </IconButton>
                          )}
                          <IconButton 
                            size="small"
                            color="error"
                            onClick={() => handleDeleteSession(session.id)}
                            title="Delete session"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Stats */}
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {sessions.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Sessions
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {sessions.filter(s => s.status === 'active').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Sessions
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {sessions.filter(s => s.status === 'pending').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Sessions
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Create Session Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New Session</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Target Port"
              type="number"
              fullWidth
              value={targetPort}
              onChange={(e) => setTargetPort(e.target.value)}
              helperText="Port number of your local development server"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateSession}
            disabled={!targetPort || isNaN(parseInt(targetPort))}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}