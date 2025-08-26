import { Box, Typography, Container, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ServerStatus from '../components/ServerStatus';
import ChromeExtension from '../components/ChromeExtension';
import { colors, gradients, effects, animations, typography } from '../styles/theme';

/**
 * Animated container
 */
const AnimatedContainer = styled(Container)({
  textAlign: 'center',
  animation: 'fadeIn 0.8s ease-out',
  position: 'relative',
  zIndex: 1,
  paddingTop: '40px',
  paddingBottom: '40px',
});

/**
 * Logo and brand container - horizontal SaaS style with animation
 */
const LogoBrandContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  marginBottom: '24px',
  position: 'relative',
});

/**
 * Logo container - prominent size with animation
 */
const LogoContainer = styled(Box)({
  width: '100px',
  height: '100px',
  ...effects.frostedGlass,
  borderRadius: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  animation: 'slideInLogo 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  opacity: 0,
  cursor: 'pointer',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'scale(1.05) rotate(5deg)',
  },
});

/**
 * Main heading with gradient text - inline with logo and animated
 */
const GradientHeading = styled(Typography)({
  fontSize: '3em',
  fontWeight: 700,
  letterSpacing: '-1px',
  background: gradients.text,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  margin: 0,
  animation: 'slideInText 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards',
  opacity: 0,
  cursor: 'pointer',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'scale(1.05)',
  },
});

/**
 * Navigation cards container
 */
const NavCards = styled(Box)({
  display: 'flex',
  gap: '20px',
  justifyContent: 'center',
  marginTop: '32px',
  marginBottom: '32px',
  flexWrap: 'wrap',
});

/**
 * Navigation card with glassmorphic effect
 */
const NavCard = styled(Box)({
  ...effects.glassmorphism,
  borderRadius: '12px',
  padding: '20px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  minWidth: '160px',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(0, 132, 255, 0.15)',
  },
});

/**
 * Example callsign chip
 */
const CallsignChip = styled(Chip)({
  padding: '4px 12px',
  background: colors.bgSecondary,
  borderRadius: '6px',
  fontFamily: typography.mono,
  fontSize: '0.8em',
  border: `1px solid ${colors.borderColor}`,
  color: colors.textPrimary,
  margin: '2px',
  height: '24px',
});

// Add animations to document
const style = document.createElement('style');
style.textContent = `
  ${animations.fadeIn}
  
  @keyframes slideInLogo {
    0% {
      transform: translateX(-60px) rotate(-10deg) scale(0.8);
      opacity: 0;
    }
    60% {
      transform: translateX(10px) rotate(2deg) scale(1.05);
      opacity: 1;
    }
    100% {
      transform: translateX(0) rotate(0deg) scale(1);
      opacity: 1;
    }
  }
  
  @keyframes slideInText {
    0% {
      transform: translateX(40px) scale(0.95);
      opacity: 0;
    }
    60% {
      transform: translateX(-5px) scale(1.02);
      opacity: 1;
    }
    100% {
      transform: translateX(0) scale(1);
      opacity: 1;
    }
  }
  
  @keyframes pulseGlow {
    0%, 100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.1) drop-shadow(0 0 20px rgba(102, 126, 234, 0.4));
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200% center;
    }
    100% {
      background-position: 200% center;
    }
  }
`;
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
    <AnimatedContainer maxWidth="md">
        {/* Logo and Title - Horizontal SaaS Style */}
        <LogoBrandContainer>
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
        </LogoBrandContainer>
        
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: '1.1em',
            marginBottom: '32px',
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

        {/* Footer */}
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: colors.textMuted, fontSize: '0.85em' }}>
            Wingman · {new Date().getFullYear()} · Made in USA 🇺🇸
          </Typography>
        </Box>
      </AnimatedContainer>
  );
}