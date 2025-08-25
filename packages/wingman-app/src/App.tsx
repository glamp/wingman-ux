import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Home from './pages/Home';
import AnnotationPreviewPage from './pages/AnnotationPreview';
import SessionLanding from './pages/SessionLanding';
import TunnelDashboard from './pages/TunnelDashboard';

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
});

/**
 * Main app component with routing for the unified Wingman web interface
 */
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Home page */}
          <Route path="/" element={<Home />} />
          
          {/* Annotation routes */}
          <Route path="/annotations" element={<AnnotationPreviewPage />} />
          
          {/* Session landing page */}
          <Route path="/sessions/:sessionId" element={<SessionLanding />} />
          
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
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;