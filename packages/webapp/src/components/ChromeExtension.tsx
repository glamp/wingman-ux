import { Box, Typography, Button, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { GetApp, Extension, Keyboard, Help } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { colors, gradients, typography } from '../styles/theme';

/**
 * Gradient heading for Chrome Extension section
 */
const GradientHeading = styled(Typography)({
  fontSize: '2em',
  marginBottom: '12px',
  fontWeight: 600,
  textAlign: 'center',
  background: gradients.text,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

/**
 * Gradient button for primary actions
 */
const GradientButton = styled(Button)({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
  padding: '14px 28px',
  background: gradients.primary,
  color: 'white',
  textDecoration: 'none',
  borderRadius: '100px',
  fontWeight: 600,
  fontSize: '1.1em',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 15px rgba(0, 132, 255, 0.2)',
  border: 'none',
  textTransform: 'none',
  '&:hover': {
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: '0 8px 25px rgba(0, 132, 255, 0.4)',
    background: gradients.primary,
  },
});

/**
 * Secondary button for alternate actions
 */
const SecondaryButton = styled(Button)({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
  padding: '14px 28px',
  background: 'white',
  color: colors.primary,
  textDecoration: 'none',
  borderRadius: '100px',
  fontWeight: 600,
  fontSize: '1.1em',
  transition: 'all 0.3s ease',
  border: `2px solid ${colors.primary}`,
  textTransform: 'none',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 15px rgba(0, 132, 255, 0.2)',
    background: 'rgba(0, 132, 255, 0.05)',
  },
});


/**
 * Keyboard shortcut display
 */
const KeyboardShortcut = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginTop: '16px',
  padding: '12px',
  background: 'rgba(0, 132, 255, 0.1)',
  borderRadius: '8px',
  border: '1px solid rgba(0, 132, 255, 0.2)',
});

/**
 * Chrome Extension section component with improved design
 */
export default function ChromeExtension() {
  const navigate = useNavigate();

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/wingman-chrome-extension.crx';
    link.download = 'wingman-chrome-extension.crx';
    link.click();
  };

  const handleInstallGuide = () => {
    navigate('/install');
  };

  return (
    <Box sx={{ margin: '60px auto 50px', maxWidth: '700px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1.5 }}>
        <Extension sx={{ fontSize: '2.5rem', color: colors.textPrimary }} />
        <GradientHeading variant="h2" sx={{ margin: 0 }}>
          Chrome Extension
        </GradientHeading>
      </Box>
      
      <Typography 
        variant="body1" 
        sx={{ 
          fontSize: '1.1em', 
          mb: 4, 
          color: colors.textSecondary,
          textAlign: 'center' 
        }}
      >
        Capture and annotate UI issues directly in your browser
      </Typography>

      <Box sx={{ display: 'flex', gap: 2.5, justifyContent: 'center', mb: 4 }}>
        <GradientButton onClick={handleDownload}>
          <GetApp /> Download Extension
        </GradientButton>

        <SecondaryButton onClick={handleInstallGuide}>
          <Help />
          Installation Guide
        </SecondaryButton>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Typography variant="body2" sx={{ color: colors.textMuted, mb: 1 }}>
          Self-hosted distribution with automatic updates
        </Typography>
        <KeyboardShortcut sx={{ maxWidth: '400px', margin: '0 auto' }}>
          <Keyboard sx={{ color: colors.primary }} />
          <Typography variant="body2" sx={{ color: colors.textSecondary }}>
            Quick access:
          </Typography>
          <Chip label="Alt+Shift+K" size="small" sx={{ mx: 0.5 }} />
          <Typography variant="body2" sx={{ color: colors.textSecondary }}>
            (Mac: Cmd+Shift+K)
          </Typography>
        </KeyboardShortcut>
      </Box>
    </Box>
  );
}