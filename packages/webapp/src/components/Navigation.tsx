import { Box, Typography, Drawer, IconButton, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
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
const NavPill = styled(Box)(({ theme }) => ({
  ...effects.glassmorphism,
  borderRadius: '50px',
  padding: '8px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  position: 'relative',
  overflow: 'hidden',
  [theme.breakpoints.down('md')]: {
    padding: '8px 16px',
  },
}));

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

/**
 * Mobile menu button
 */
const MobileMenuButton = styled(IconButton)(({ theme }) => ({
  display: 'none',
  color: colors.primary,
  [theme.breakpoints.down('md')]: {
    display: 'flex',
  },
}));

/**
 * Desktop nav items container
 */
const DesktopNavItems = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}));

interface NavItemData {
  path: string;
  label: string;
}

const navItems: NavItemData[] = [
  { path: '/', label: 'Home' },
  { path: '/install', label: 'Install' },
  { path: '/docs', label: 'Docs' },
  { path: '/status', label: 'Status' },
  // Beta features temporarily hidden for public launch
  // { path: '/tunnels', label: 'Tunnels' },
  // { path: '/annotations', label: 'Annotations' },
  // { path: '/dashboard', label: 'Dashboard' },
];

/**
 * Floating pill navigation component with glassmorphic design
 */
export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <NavContainer>
        <NavPill>
          <NavLogo onClick={() => navigate('/')}>
            <img
              src="/wingman.png"
              alt="Wingman"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </NavLogo>

          {/* Desktop Navigation */}
          <DesktopNavItems>
            {navItems.map((item) => (
              <NavItem
                key={item.path}
                isActive={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <NavText>{item.label}</NavText>
              </NavItem>
            ))}

            <SignInButton onClick={() => navigate('/beta-signup')}>
              <NavText>Sign In</NavText>
            </SignInButton>
          </DesktopNavItems>

          {/* Mobile Menu Button */}
          <MobileMenuButton
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon />
          </MobileMenuButton>
        </NavPill>
      </NavContainer>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            width: '280px',
            background: colors.bgPrimary,
            ...effects.glassmorphism,
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: colors.primary }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <List sx={{ px: 2 }}>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  borderRadius: '12px',
                  '&.Mui-selected': {
                    background: gradients.primary,
                    color: 'white',
                    '&:hover': {
                      background: gradients.primary,
                    }
                  }
                }}
              >
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: location.pathname === item.path ? 600 : 500
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}

          <ListItem disablePadding sx={{ mt: 2 }}>
            <ListItemButton
              onClick={() => handleNavigation('/beta-signup')}
              sx={{
                borderRadius: '12px',
                background: gradients.primary,
                color: 'white',
                '&:hover': {
                  background: gradients.primary,
                  opacity: 0.9,
                }
              }}
            >
              <ListItemText
                primary="Sign In"
                primaryTypographyProps={{ fontWeight: 600 }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
}