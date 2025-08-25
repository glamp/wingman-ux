import { Box, Typography, Container, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ServerStatus from '../components/ServerStatus';
import ChromeExtension from '../components/ChromeExtension';
import { colors, gradients, effects, animations, typography } from '../styles/theme';

/**
 * Main container with gradient background
 */
const GradientBackground = styled(Box)({
  background: gradients.background,
  minHeight: '100vh',
  position: 'relative',
  fontFamily: typography.fontFamily,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      radial-gradient(circle at 25% 25%, rgba(0, 132, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
    `,
    pointerEvents: 'none',
    zIndex: 0,
  },
});

/**
 * Animated container
 */
const AnimatedContainer = styled(Container)({
  textAlign: 'center',
  animation: 'fadeIn 0.8s ease-out',
  position: 'relative',
  zIndex: 1,
  paddingTop: '60px',
  paddingBottom: '60px',
});

/**
 * Logo container with frosted glass effect
 */
const LogoContainer = styled(Box)({
  width: '120px',
  height: '120px',
  margin: '0 auto 30px',
  ...effects.frostedGlass,
  borderRadius: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
});

/**
 * Main heading with gradient text
 */
const GradientHeading = styled(Typography)({
  fontSize: '3em',
  marginBottom: '20px',
  fontWeight: 700,
  letterSpacing: '-1px',
  background: gradients.text,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

/**
 * Navigation cards container
 */
const NavCards = styled(Box)({
  display: 'flex',
  gap: '24px',
  justifyContent: 'center',
  marginTop: '40px',
  marginBottom: '40px',
  flexWrap: 'wrap',
});

/**
 * Navigation card with glassmorphic effect
 */
const NavCard = styled(Box)({
  ...effects.glassmorphism,
  borderRadius: '16px',
  padding: '24px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  minWidth: '200px',
  '&:hover': {
    transform: 'translateY(-4px) scale(1.02)',
    boxShadow: '0 12px 40px rgba(0, 132, 255, 0.2)',
  },
});

/**
 * Example callsign chip
 */
const CallsignChip = styled(Chip)({
  padding: '8px 16px',
  background: colors.bgSecondary,
  borderRadius: '8px',
  fontFamily: typography.mono,
  fontSize: '0.9em',
  border: `1px solid ${colors.borderColor}`,
  color: colors.textPrimary,
  margin: '4px',
});

// Add fadeIn animation to document
const style = document.createElement('style');
style.textContent = animations.fadeIn;
if (!document.querySelector('style[data-wingman-animations]')) {
  style.setAttribute('data-wingman-animations', 'true');
  document.head.appendChild(style);
}

/**
 * Home page with elegant gradient design
 */
export default function Home() {
  const navigate = useNavigate();

  return (
    <GradientBackground>
      <AnimatedContainer maxWidth="lg">
        {/* Logo and Title */}
        <LogoContainer>
          <img 
            src="/wingman.png" 
            alt="Wingman"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </LogoContainer>
        
        <GradientHeading variant="h1">
          Wingman
        </GradientHeading>
        
        <Typography 
          variant="h5" 
          sx={{ 
            fontSize: '1.4em',
            marginBottom: '40px',
            color: colors.textSecondary,
            fontWeight: 300
          }}
        >
          Lightweight UX feedback assistant for developers
        </Typography>

        {/* Server Status */}
        <ServerStatus />

        {/* Navigation Cards */}
        <NavCards>
          <NavCard onClick={() => navigate('/annotations')}>
            <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 600 }}>
              📝 Annotations
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 1 }}>
              View feedback
            </Typography>
          </NavCard>
          
          <NavCard onClick={() => navigate('/tunnels')}>
            <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 600 }}>
              🚇 Tunnels
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 1 }}>
              Share sessions
            </Typography>
          </NavCard>
          
          <NavCard onClick={() => navigate('/dashboard')}>
            <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 600 }}>
              📊 Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 1 }}>
              System status
            </Typography>
          </NavCard>
        </NavCards>

        {/* Chrome Extension Section */}
        <ChromeExtension />

        {/* Aviation Callsigns */}
        <Box sx={{ mt: 6, mb: 4 }}>
          <Typography variant="body2" sx={{ color: colors.textMuted, mb: 2 }}>
            Example session IDs:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
            <CallsignChip label="ghost-whiskey" />
            <CallsignChip label="falcon-tango" />
            <CallsignChip label="eagle-foxtrot" />
            <CallsignChip label="hawk-sierra" />
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 8, color: colors.textMuted, fontSize: '0.95em' }}>
          <Typography variant="body2">
            Server running at{' '}
            <Box component="span" sx={{ color: colors.primary, fontWeight: 500 }}>
              {window.location.origin}
            </Box>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <a 
              href="https://github.com/glamp/wingman-ux" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: colors.primary, 
                textDecoration: 'none',
                borderBottom: '1px solid transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = colors.primary}
              onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
            >
              View on GitHub
            </a>
          </Typography>
        </Box>
      </AnimatedContainer>
    </GradientBackground>
  );
}