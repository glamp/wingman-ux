import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Button,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import { 
  Share as ShareIcon,
  ContentCopy,
  CheckCircle, 
  Error as ErrorIcon, 
  HourglassEmpty,
  Flight,
  Link as LinkIcon,
  Visibility,
  Code
} from '@mui/icons-material';

interface ShareInfo {
  sessionId: string;
  targetPort: number;
  status: 'pending' | 'active' | 'expired';
  tunnelUrl?: string;
  createdAt: string;
  shareInfo: {
    accessCount: number;
    lastAccessed: string;
    label?: string;
    expiresAt?: string;
  };
}

/**
 * Landing page for shareable tunnel links - Loom-style unguessable URLs
 * This provides a clean, frictionless way for PMs to access tunnel sessions
 */
export default function ShareLanding() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const [shareData, setShareData] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'share' | 'tunnel' | null>(null);

  useEffect(() => {
    if (!shareToken) return;

    // Fetch share data
    const fetchShareData = async () => {
      try {
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://wingman-tunnel.fly.dev'
          : 'http://localhost:8787';
          
        const response = await fetch(`${baseUrl}/tunnel/share/${shareToken}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            const data = await response.json();
            if (data.code === 'SHARE_NOT_FOUND') {
              setError('This share link has expired or been revoked.');
            } else {
              setError('The tunnel session associated with this link no longer exists.');
            }
          } else {
            setError('Failed to load tunnel information.');
          }
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        setShareData(data);
        setLoading(false);

        // If session is active, redirect to the actual session page
        if (data.status === 'active' && data.sessionId) {
          // Redirect to the subdomain-based session page
          navigate(`/session/${data.sessionId}`);
        }
      } catch (err) {
        setError('Failed to connect to server. Please check your connection and try again.');
        setLoading(false);
      }
    };

    fetchShareData();
  }, [shareToken, navigate]);

  const copyToClipboard = async (text: string, type: 'share' | 'tunnel') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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
          <Alert 
            severity="error" 
            sx={{ width: '100%' }}
            action={
              <Button color="inherit" size="small" onClick={() => window.location.href = '/'}>
                Go to Homepage
              </Button>
            }
          >
            <Typography variant="h6" gutterBottom>
              Unable to Access Tunnel
            </Typography>
            {error}
          </Alert>
        </Box>
      </Container>
    );
  }

  const getStatusIcon = () => {
    switch (shareData?.status) {
      case 'active':
        return <CheckCircle sx={{ fontSize: 80, color: 'success.main' }} />;
      case 'expired':
        return <ErrorIcon sx={{ fontSize: 80, color: 'error.main' }} />;
      default:
        return <HourglassEmpty sx={{ fontSize: 80, color: 'warning.main' }} />;
    }
  };

  const getStatusMessage = () => {
    switch (shareData?.status) {
      case 'active':
        return 'Tunnel Active';
      case 'expired':
        return 'Tunnel Expired';
      default:
        return 'Waiting for Developer...';
    }
  };

  const getStatusColor = () => {
    switch (shareData?.status) {
      case 'active':
        return 'success';
      case 'expired':
        return 'error';
      default:
        return 'warning';
    }
  };

  const shareUrl = window.location.href;
  const developerUrl = shareData?.tunnelUrl || `https://${shareData?.sessionId}.wingmanux.com`;

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
              <ShareIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold' }}>
                Wingman Share
              </Typography>
            </Box>
            
            {shareData?.shareInfo.label && (
              <Typography variant="h5" color="text.secondary" gutterBottom>
                {shareData.shareInfo.label}
              </Typography>
            )}
            
            <Typography variant="body1" color="text.secondary">
              Secure tunnel access via shareable link
            </Typography>
          </Box>

          {/* Status */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            {getStatusIcon()}
            <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
              {getStatusMessage()}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
              <Chip 
                label={shareData?.status.toUpperCase()} 
                color={getStatusColor() as any}
              />
              <Chip 
                icon={<Visibility />}
                label={`${shareData?.shareInfo.accessCount} views`}
                variant="outlined"
              />
            </Box>
          </Box>

          {/* Session Details */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Target Application
              </Typography>
              <Typography variant="h6">
                localhost:{shareData?.targetPort}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Session ID
              </Typography>
              <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                {shareData?.sessionId}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body1">
                {shareData?.createdAt ? new Date(shareData.createdAt).toLocaleString() : 'Unknown'}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Last Accessed
              </Typography>
              <Typography variant="body1">
                {shareData?.shareInfo.lastAccessed ? new Date(shareData.shareInfo.lastAccessed).toLocaleString() : 'Never'}
              </Typography>
            </Grid>

            {shareData?.shareInfo.expiresAt && (
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This link expires on {new Date(shareData.shareInfo.expiresAt).toLocaleString()}
                </Alert>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Share Links */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Share Links
            </Typography>
            
            {/* PM/Reviewer Link */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    <LinkIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                    Shareable Link (for PMs & Reviewers)
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {shareUrl}
                  </Typography>
                </Box>
                <Tooltip title={copied === 'share' ? 'Copied!' : 'Copy link'}>
                  <IconButton 
                    onClick={() => copyToClipboard(shareUrl, 'share')}
                    color={copied === 'share' ? 'success' : 'default'}
                  >
                    {copied === 'share' ? <CheckCircle /> : <ContentCopy />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>

            {/* Developer Link */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    <Code sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                    Developer Tunnel URL
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {developerUrl}
                  </Typography>
                </Box>
                <Tooltip title={copied === 'tunnel' ? 'Copied!' : 'Copy developer URL'}>
                  <IconButton 
                    onClick={() => copyToClipboard(developerUrl, 'tunnel')}
                    color={copied === 'tunnel' ? 'success' : 'default'}
                  >
                    {copied === 'tunnel' ? <CheckCircle /> : <ContentCopy />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          </Box>

          {/* Status-specific messages */}
          {shareData?.status === 'active' && (
            <Alert severity="success" icon={<Flight />}>
              <Typography variant="subtitle1" gutterBottom>
                Ready for takeoff!
              </Typography>
              <Typography variant="body2">
                The developer's application on port {shareData?.targetPort} is accessible through this tunnel.
                Click "Access Tunnel" to view the application.
              </Typography>
            </Alert>
          )}

          {shareData?.status === 'pending' && (
            <Alert severity="info">
              <Typography variant="subtitle1" gutterBottom>
                Waiting for developer connection
              </Typography>
              <Typography variant="body2">
                The developer needs to run their application on port {shareData?.targetPort} and connect to the tunnel.
                This page will update automatically when the connection is established.
              </Typography>
            </Alert>
          )}

          {shareData?.status === 'expired' && (
            <Alert severity="error">
              <Typography variant="subtitle1" gutterBottom>
                Tunnel has expired
              </Typography>
              <Typography variant="body2">
                This tunnel session is no longer active. Please ask the developer to create a new tunnel.
              </Typography>
            </Alert>
          )}

          {/* Action Button */}
          {shareData?.status === 'active' && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate(`/session/${shareData.sessionId}`)}
                startIcon={<Flight />}
                sx={{ 
                  background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                  boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                }}
              >
                Access Tunnel
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}