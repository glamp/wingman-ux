import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Home from './pages/Home';
import AnnotationPreviewPage from './pages/AnnotationPreview';
import SessionLanding from './pages/SessionLanding';
import ShareLanding from './pages/ShareLanding';
import TunnelDashboard from './pages/TunnelDashboard';
import Navigation from './components/Navigation';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
  },
  typography: {
    fontFamily: `'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
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
    <>
      {!hideNavigation && <Navigation />}
      <Routes>
        {/* Home page */}
        <Route path="/" element={<Home />} />
        
        {/* Annotation routes */}
        <Route path="/annotations" element={<AnnotationPreviewPage />} />
        
        {/* Session landing page (developer URLs) */}
        <Route path="/sessions/:sessionId" element={<SessionLanding />} />
        <Route path="/session/:sessionId" element={<SessionLanding />} />
        
        {/* Share landing page (Loom-style URLs) */}
        <Route path="/s/:shareToken" element={<ShareLanding />} />
        
        {/* Tunnel dashboard */}
        <Route path="/tunnels" element={<TunnelDashboard />} />
        
        {/* Dashboard (placeholder for now) */}
        <Route path="/dashboard" element={
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>Dashboard Coming Soon</h1>
            <p>Server status and monitoring will be available here.</p>
          </div>
        } />
        
        {/* Legacy route for backwards compatibility */}
        <Route path="/preview" element={<Navigate to="/annotations" replace />} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
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