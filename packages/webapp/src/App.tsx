import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import Home from './pages/Home';
import AnnotationPreviewPage from './pages/AnnotationPreview';
import SessionLanding from './pages/SessionLanding';
import ShareLanding from './pages/ShareLanding';
import TunnelDashboard from './pages/TunnelDashboard';
import InstallationGuide from './pages/InstallationGuide';
import Privacy from './pages/Privacy';
import BetaSignup from './pages/BetaSignup';
import Documentation from './pages/Documentation';
import Status from './pages/Status';
import Navigation from './components/Navigation';
import { gradients, typography } from './styles/theme';
import { theme } from './theme';

/**
 * Global gradient background for all pages
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
 * Layout wrapper that conditionally shows navigation
 */
function AppLayout() {
  const location = useLocation();
  
  // Don't show navigation on session/share landing pages
  const hideNavigation = location.pathname.startsWith('/sessions/') || 
                         location.pathname.startsWith('/session/') || 
                         location.pathname.startsWith('/s/');

  return (
    <GradientBackground>
      {!hideNavigation && <Navigation />}
      <Routes>
        {/* Home page */}
        <Route path="/" element={<Home />} />

        {/* Installation guide */}
        <Route path="/install" element={<InstallationGuide />} />

        {/* Documentation */}
        <Route path="/docs" element={<Documentation />} />

        {/* Status page */}
        <Route path="/status" element={<Status />} />

        {/* Privacy policy */}
        <Route path="/privacy" element={<Privacy />} />

        {/* Beta signup */}
        <Route path="/beta-signup" element={<BetaSignup />} />

        {/* Session landing page (developer URLs) */}
        <Route path="/sessions/:sessionId" element={<SessionLanding />} />
        <Route path="/session/:sessionId" element={<SessionLanding />} />

        {/* Share landing page (Loom-style URLs) */}
        <Route path="/s/:shareToken" element={<ShareLanding />} />

        {/* Beta features temporarily hidden for public launch */}
        {/* <Route path="/annotations" element={<AnnotationPreviewPage />} /> */}
        {/* <Route path="/tunnels" element={<TunnelDashboard />} /> */}
        {/* <Route path="/dashboard" element={
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>Dashboard Coming Soon</h1>
            <p>Server status and monitoring will be available here.</p>
          </div>
        } /> */}
        {/* <Route path="/preview" element={<Navigate to="/annotations" replace />} /> */}

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GradientBackground>
  );
}

/**
 * Main app component with routing for the unified Wingman web interface
 */
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;