import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useLocation, useNavigate } from 'react-router-dom';
import { colors, gradients, effects } from '../styles/theme';

/**
 * Floating pill navigation container
 */
const NavContainer = styled(Box)({
  position: 'sticky',
  top: '20px',
  zIndex: 1000,
  display: 'flex',
  justifyContent: 'center',
  padding: '0 20px',
  marginBottom: '40px',
});

/**
 * Glassmorphic navigation pill
 */
const NavPill = styled(Box)({
  ...effects.glassmorphism,
  borderRadius: '50px',
  padding: '8px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  position: 'relative',
  overflow: 'hidden',
});

/**
 * Individual navigation item
 */
const NavItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive: boolean }>(({ isActive }) => ({
  position: 'relative',
  padding: '12px 20px',
  borderRadius: '24px',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  zIndex: 2,
  background: isActive ? gradients.primary : 'transparent',
  color: isActive ? 'white' : colors.textPrimary,
  fontWeight: isActive ? 600 : 500,
  '&:hover': {
    background: isActive ? gradients.primary : 'rgba(102, 126, 234, 0.1)',
    transform: 'scale(1.05)',
  },
}));

/**
 * Navigation text
 */
const NavText = styled(Typography)({
  fontSize: '0.95rem',
  fontWeight: 'inherit',
  whiteSpace: 'nowrap',
  userSelect: 'none',
});

/**
 * Logo container in nav
 */
const NavLogo = styled(Box)({
  width: '32px',
  height: '32px',
  ...effects.frostedGlass,
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px',
  marginRight: '16px',
  cursor: 'pointer',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'scale(1.1) rotate(5deg)',
  },
});

/**
 * Sign in button with gradient accent styling
 */
const SignInButton = styled(Box)({
  padding: '12px 20px',
  borderRadius: '24px',
  cursor: 'pointer',
  background: gradients.primary,
  color: 'white',
  fontWeight: 600,
  marginLeft: '8px',
  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
  },
});

interface NavItemData {
  path: string;
  label: string;
}

const navItems: NavItemData[] = [
  { path: '/', label: 'Home' },
  { path: '/tunnels', label: 'Tunnels' },
  { path: '/annotations', label: 'Annotations' },
  { path: '/dashboard', label: 'Dashboard' },
];

/**
 * Floating pill navigation component with glassmorphic design
 */
export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <NavContainer>
      <NavPill>
        <NavLogo onClick={() => navigate('/')}>
          <img 
            src="/wingman.png" 
            alt="Wingman"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </NavLogo>
        
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            isActive={location.pathname === item.path}
            onClick={() => handleNavigation(item.path)}
          >
            <NavText>{item.label}</NavText>
          </NavItem>
        ))}
        
        <SignInButton onClick={() => console.log('Sign in clicked')}>
          <NavText>Sign In</NavText>
        </SignInButton>
      </NavPill>
    </NavContainer>
  );
}