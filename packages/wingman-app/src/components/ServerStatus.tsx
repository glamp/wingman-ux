import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useServerHealth, formatUptime } from '../hooks/useServerHealth';
import { useSessionCount } from '../hooks/useSessionCount';
import { colors, gradients, effects, animations } from '../styles/theme';

/**
 * Glassmorphic status card component
 */
const StatusCard = styled(Box)(({ theme }) => ({
  ...effects.glassmorphism,
  borderRadius: '24px',
  padding: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '24px',
  margin: '0 auto 40px',
  maxWidth: '500px',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: gradients.primary,
    opacity: 0.8,
  },
  // Mobile responsive styles
  '@media (max-width: 600px)': {
    padding: '16px',
    gap: '16px',
    borderRadius: '16px',
  },
}));

/**
 * Pulsing health indicator
 */
const PulseIndicator = styled('div')<{ healthy: boolean }>(({ healthy }) => ({
  minWidth: '12px',
  minHeight: '12px',
  width: '12px',
  height: '12px',
  background: healthy ? colors.success : colors.error,
  borderRadius: '50%',
  animation: healthy 
    ? 'pulseHealthy 2s infinite' 
    : 'pulseError 2s infinite',
  flexShrink: 0, // Prevent squishing
}));

/**
 * Session count display with gradient text
 */
const SessionCount = styled(Typography)({
  fontSize: '1.8em',
  fontWeight: 700,
  background: gradients.text,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

// Add keyframe animations to the document
const style = document.createElement('style');
style.textContent = animations.pulseHealthy + animations.pulseError;
document.head.appendChild(style);

/**
 * Server status component with health indicator and session count
 */
export default function ServerStatus() {
  const health = useServerHealth();
  const sessions = useSessionCount();
  const isHealthy = health.status === 'healthy';

  return (
    <StatusCard>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <PulseIndicator healthy={isHealthy} />
        <Box>
          <Typography variant="body1" color={colors.textSecondary}>
            Server {isHealthy ? 'Operational' : 'Unavailable'}
          </Typography>
          {isHealthy && health.uptime && (
            <Typography variant="caption" color={colors.textMuted}>
              Uptime: {formatUptime(health.uptime)}
            </Typography>
          )}
        </Box>
      </Box>
      
      <Box sx={{ width: '1px', height: '40px', bgcolor: colors.borderColor, opacity: 0.5 }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <SessionCount>{sessions.count}</SessionCount>
        <Typography variant="body2" color={colors.textSecondary} fontWeight={500}>
          Active<br />Sessions
        </Typography>
      </Box>
    </StatusCard>
  );
}