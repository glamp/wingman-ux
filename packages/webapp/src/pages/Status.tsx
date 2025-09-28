import { Box, Typography, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import ServerStatus from '../components/ServerStatus';
import { colors, gradients, animations } from '../styles/theme';

const AnimatedContainer = styled(Container)({
  textAlign: 'center',
  animation: 'fadeIn 0.8s ease-out',
  position: 'relative',
  zIndex: 1,
  paddingTop: '40px',
  paddingBottom: '40px',
});

const GradientHeading = styled(Typography)({
  fontSize: '2.5em',
  fontWeight: 700,
  letterSpacing: '-1px',
  background: gradients.text,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  marginBottom: '16px',
});

// Add animations to document
const style = document.createElement('style');
style.textContent = animations.fadeIn;
if (!document.querySelector('style[data-wingman-status-animations]')) {
  style.setAttribute('data-wingman-status-animations', 'true');
  document.head.appendChild(style);
}

export default function Status() {
  return (
    <AnimatedContainer maxWidth="md">
      <GradientHeading variant="h1">
        System Status
      </GradientHeading>

      <Typography
        variant="h6"
        sx={{
          fontSize: '1.1em',
          marginBottom: '32px',
          color: colors.textSecondary,
          fontWeight: 300
        }}
      >
        Real-time status of Wingman services
      </Typography>

      <ServerStatus />

      <Box sx={{ mt: 8 }}>
        <Typography variant="body2" sx={{ color: colors.textMuted, fontSize: '0.85em' }}>
          All systems are monitored 24/7. Status updates every 30 seconds.
        </Typography>
      </Box>
    </AnimatedContainer>
  );
}