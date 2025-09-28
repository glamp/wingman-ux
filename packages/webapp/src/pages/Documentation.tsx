import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  IconButton,
  Tabs,
  Tab,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  InputAdornment,
  Collapse,
  Badge,
  Link,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  RocketLaunch,
  Extension,
  Code,
  ContentCopy,
  Check,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Search,
  GitHub,
  AutoFixHigh,
  IntegrationInstructions,
  Api,
  Book,
  Menu as MenuIcon,
  ChevronRight,
  InfoOutlined,
  SecurityOutlined,
  KeyboardOutlined,
  BugReportOutlined,
} from '@mui/icons-material';
import { colors, gradients, typography } from '../styles/theme';

// Styled components
const DocContainer = styled(Box)({
  display: 'flex',
  minHeight: 'calc(100vh - 64px)',
  position: 'relative',
  backgroundColor: '#0a0b0d',
});

const Sidebar = styled(Box)(({ theme }) => ({
  width: 280,
  borderRight: `1px solid ${colors.borderColor}`,
  background: 'rgba(10, 11, 13, 0.95)',
  backdropFilter: 'blur(10px)',
  overflowY: 'auto',
  position: 'sticky',
  top: 64,
  height: 'calc(100vh - 64px)',
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}));

const MainContent = styled(Box)({
  flex: 1,
  padding: '48px',
  maxWidth: '1200px',
  margin: '0 auto',
  width: '100%',
});

const HeroSection = styled(Box)(({ theme }) => ({
  background: theme.palette.background.paper,
  borderRadius: '24px',
  padding: '64px 48px',
  marginBottom: '48px',
  position: 'relative',
  overflow: 'hidden',
  textAlign: 'center',
  boxShadow: theme.shadows[2],
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 25% 25%, rgba(102, 126, 234, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)
    `,
    pointerEvents: 'none',
  },
}));

const DocSection = styled(Box)(({ theme }) => ({
  marginBottom: '64px',
  '& h4': {
    marginBottom: '24px',
  },
  '& h6': {
    marginBottom: '16px',
    color: theme.palette.text.primary,
  },
}));

const CodeBlock = styled(Box)({
  backgroundColor: '#1e1e1e',
  borderRadius: '12px',
  border: `1px solid ${colors.borderColor}`,
  position: 'relative',
  overflow: 'hidden',
  marginBottom: '24px',
  '& pre': {
    margin: 0,
    padding: '20px',
    overflowX: 'auto',
    fontSize: '14px',
    lineHeight: '1.6',
    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
  },
  '& code': {
    color: '#d4d4d4',
    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
  },
});

const CopyButton = styled(IconButton)({
  position: 'absolute',
  top: '12px',
  right: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: colors.textMuted,
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: colors.textPrimary,
  },
});

const NavItem = styled(ListItem)(({ active }: { active?: boolean }) => ({
  padding: '8px 16px',
  cursor: 'pointer',
  borderRadius: '8px',
  marginBottom: '4px',
  backgroundColor: active ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
  borderLeft: active ? `3px solid ${colors.primary}` : '3px solid transparent',
  '&:hover': {
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
  },
}));

const FeatureCard = styled(Paper)({
  padding: '24px',
  background: gradients.cardGradient,
  border: `1px solid ${colors.borderColor}`,
  borderRadius: '16px',
  textAlign: 'center',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    borderColor: colors.primary,
  },
});

const VariableChip = styled(Chip)(({ theme }) => ({
  fontFamily: 'monospace',
  fontSize: '13px',
  margin: '4px',
  backgroundColor: theme.palette.mode === 'light' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0.2)',
  border: `1px solid ${theme.palette.primary.main}`,
  color: theme.palette.primary.main,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'light' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(102, 126, 234, 0.3)',
  },
}));

const SearchField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    '& fieldset': {
      borderColor: colors.borderColor,
    },
    '&:hover fieldset': {
      borderColor: colors.primary,
    },
  },
});

const VersionBadge = styled(Chip)({
  position: 'absolute',
  top: '16px',
  right: '16px',
  background: gradients.primary,
  color: 'white',
  fontWeight: 600,
});

const TabPanel = styled(Box)({
  marginTop: '24px',
});

// Navigation structure
const navigationItems = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: <RocketLaunch />,
    sections: ['overview', 'installation', 'quick-capture', 'keyboard-shortcuts', 'output-modes'],
  },
  {
    id: 'react-sdk',
    label: 'React SDK',
    icon: <IntegrationInstructions />,
    sections: ['why-sdk', 'sdk-installation', 'sdk-quick-start', 'configuration', 'hooks', 'oauth', 'troubleshooting-sdk'],
  },
  {
    id: 'templates',
    label: 'Prompt Templates',
    icon: <AutoFixHigh />,
    sections: ['template-editor', 'syntax', 'variables', 'template-examples'],
  },
  {
    id: 'api',
    label: 'API Reference',
    icon: <Api />,
    sections: ['data-structure', 'chrome-apis', 'endpoints'],
  },
  {
    id: 'guides',
    label: 'Guides',
    icon: <Book />,
    sections: ['best-practices', 'privacy', 'troubleshooting'],
  },
];

// Code examples
const codeExamples = {
  'npm': 'npm install wingman-sdk',
  'yarn': 'yarn add wingman-sdk',
  'pnpm': 'pnpm add wingman-sdk',
  'bun': 'bun add wingman-sdk',
};

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [packageManager, setPackageManager] = useState(0);
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started', 'react-sdk']);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  // Parse markdown content (simplified for this example)
  const renderContent = () => {
    return (
      <>
        {/* Hero Section */}
        <HeroSection>
          <Container maxWidth="md">
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  background: gradients.text,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  mb: 2,
                }}
              >
                Wingman Documentation
              </Typography>
              <Typography variant="h5" sx={{ color: colors.textSecondary, mb: 4 }}>
                Everything you need to integrate Wingman into your workflow
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<RocketLaunch />}
                  sx={{
                    background: gradients.primary,
                    borderRadius: '100px',
                    padding: '12px 24px',
                    '&:hover': {
                      background: gradients.primary,
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => scrollToSection('quick-capture')}
                >
                  Quick Start
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<GitHub />}
                  sx={{ borderRadius: '100px', padding: '12px 24px' }}
                  href="https://github.com/glamp/wingman-attempt-4"
                  target="_blank"
                >
                  View on GitHub
                </Button>
              </Stack>
            </Box>
            <VersionBadge label="v1.0.2" />
          </Container>
        </HeroSection>

        {/* Getting Started Section */}
        <DocSection id="getting-started">
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
            Getting Started
          </Typography>

          <Box id="overview" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Overview
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: colors.textSecondary }}>
              Wingman is a lightweight Chrome extension that helps developers capture and share UX feedback with AI-ready prompts.
              It streamlines the process of reporting UI issues and getting them fixed quickly. When combined with the optional React SDK,
              you get deep component introspection and metadata that makes debugging even more powerful.
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Prerequisites:</strong> Chrome browser v90+ and Node.js 16+ (for SDK)
            </Typography>
          </Alert>

          <Box id="installation" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Installation
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: colors.textSecondary }}>
              For the best experience, install both the Chrome Extension (required) and the React SDK (recommended for React apps):
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <FeatureCard
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  border: `2px solid ${colors.primary}`,
                }}
                onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}
              >
                <Extension sx={{ fontSize: 48, color: colors.primary, mb: 2 }} />
                <Typography variant="h6">Chrome Extension</Typography>
                <Typography variant="body2" color="text.secondary">
                  Required for capturing feedback
                </Typography>
                <Button size="small" sx={{ mt: 2 }}>
                  Install Extension →
                </Button>
              </FeatureCard>
              <FeatureCard
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                }}
                onClick={() => scrollToSection('sdk-installation')}
              >
                <Code sx={{ fontSize: 48, color: colors.primary, mb: 2 }} />
                <Typography variant="h6">React SDK</Typography>
                <Typography variant="body2" color="text.secondary">
                  Enhanced React integration
                </Typography>
                <Chip label="Recommended" size="small" color="success" sx={{ mt: 1 }} />
                <Button size="small" sx={{ mt: 2 }}>
                  View SDK Guide →
                </Button>
              </FeatureCard>
            </Stack>
          </Box>

          <Box id="quick-capture" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              How to Capture Feedback
            </Typography>

            <Stack spacing={2} sx={{ mb: 3 }}>
              <Paper sx={{ p: 3, background: gradients.cardGradient }}>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Step 1: Activate Capture Mode
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  Press <Chip size="small" label="⌘+Shift+K" /> (Mac) or <Chip size="small" label="Ctrl+Shift+K" /> (Windows/Linux) on any webpage
                </Typography>
              </Paper>

              <Paper sx={{ p: 3, background: gradients.cardGradient }}>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Step 2: Select the Problem Area
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  Click on a specific element or drag to select a region of the page
                </Typography>
              </Paper>

              <Paper sx={{ p: 3, background: gradients.cardGradient }}>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Step 3: Describe the Issue
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  Add your feedback in the annotation panel that appears
                </Typography>
              </Paper>

              <Paper sx={{ p: 3, background: gradients.cardGradient }}>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Step 4: Generate AI-Ready Prompt
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  Click "Submit" to generate a formatted prompt with all technical context
                </Typography>
              </Paper>
            </Stack>
          </Box>

          <Box id="keyboard-shortcuts" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Keyboard Shortcuts
            </Typography>
            <Stack spacing={1}>
              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.02)' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Chip label="⌘+Shift+K" sx={{ fontFamily: 'monospace' }} />
                  <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                    Start capture mode (Mac)
                  </Typography>
                </Stack>
              </Paper>
              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.02)' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Chip label="Ctrl+Shift+K" sx={{ fontFamily: 'monospace' }} />
                  <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                    Start capture mode (Windows/Linux)
                  </Typography>
                </Stack>
              </Paper>
              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.02)' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Chip label="Escape" sx={{ fontFamily: 'monospace' }} />
                  <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                    Cancel capture mode
                  </Typography>
                </Stack>
              </Paper>
              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.02)' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Chip label="Enter" sx={{ fontFamily: 'monospace' }} />
                  <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                    Submit feedback (when annotation panel is open)
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          </Box>

          <Box id="output-modes" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Output Modes
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Clipboard Mode (Default):</strong> Feedback is copied to your clipboard for easy pasting into any AI assistant.
                Screenshots are saved to your Downloads folder.
              </Typography>
            </Alert>
            <Typography variant="body2" sx={{ color: colors.textMuted }}>
              Server modes (Local and Remote) are coming soon for team collaboration features.
            </Typography>
          </Box>
        </DocSection>

        {/* React SDK Section */}
        <DocSection id="react-sdk">
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
            React SDK Integration
          </Typography>

          <Box id="why-sdk" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Why Use the SDK?
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: colors.textSecondary }}>
              The Wingman SDK supercharges your React application with enhanced feedback capabilities:
            </Typography>
            <Stack spacing={2}>
              <Paper sx={{ p: 2, background: 'rgba(102, 126, 234, 0.05)' }}>
                <Typography variant="body2">
                  <strong>🎯 Automatic React metadata extraction</strong> - Component names, props, and state
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, background: 'rgba(102, 126, 234, 0.05)' }}>
                <Typography variant="body2">
                  <strong>🔄 OAuth tunnel support</strong> - Seamless development with ngrok/localtunnel
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, background: 'rgba(102, 126, 234, 0.05)' }}>
                <Typography variant="body2">
                  <strong>⚡ Zero configuration</strong> - Drop in and go
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, background: 'rgba(102, 126, 234, 0.05)' }}>
                <Typography variant="body2">
                  <strong>🔒 Privacy-first</strong> - All data stays local
                </Typography>
              </Paper>
            </Stack>
          </Box>

          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="body2">
              The SDK captures actual React component state and props — giving AI the complete context it needs!
            </Typography>
          </Alert>

          <Box id="sdk-installation" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Installation
            </Typography>
            <Paper sx={{ bgcolor: '#1e1e1e', mb: 3 }}>
              <Tabs
                value={packageManager}
                onChange={(e, v) => setPackageManager(v)}
                sx={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  '& .MuiTab-root': {
                    color: colors.textMuted,
                    textTransform: 'none',
                  },
                  '& .Mui-selected': {
                    color: colors.primary,
                  },
                }}
              >
                <Tab label="npm" />
                <Tab label="yarn" />
                <Tab label="pnpm" />
                <Tab label="bun" />
              </Tabs>
              {['npm', 'yarn', 'pnpm', 'bun'].map((pm, index) => (
                <TabPanel key={pm} hidden={packageManager !== index}>
                  <CodeBlock>
                    <Box sx={{ position: 'relative' }}>
                      <CopyButton
                        size="small"
                        onClick={() => handleCopyCode(codeExamples[pm as keyof typeof codeExamples], pm)}
                      >
                        {copiedCode === pm ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                      </CopyButton>
                      <pre>
                        <code>{codeExamples[pm as keyof typeof codeExamples]}</code>
                      </pre>
                    </Box>
                  </CodeBlock>
                </TabPanel>
              ))}
            </Paper>
          </Box>

          <Box id="sdk-quick-start" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Quick Start
            </Typography>
            <CodeBlock>
              <Box sx={{ position: 'relative' }}>
                <CopyButton
                  size="small"
                  onClick={() => handleCopyCode(
                    `import { WingmanProvider } from 'wingman-sdk';

function App() {
  return (
    <WingmanProvider config={{ debug: true }}>
      {/* Your app components */}
    </WingmanProvider>
  );
}

export default App;`,
                    'quickstart'
                  )}
                >
                  {copiedCode === 'quickstart' ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                </CopyButton>
                <pre>
                  <code>
                    <span style={{ color: '#c586c0' }}>import</span>
                    <span style={{ color: '#d4d4d4' }}> {'{ '}</span>
                    <span style={{ color: '#9cdcfe' }}>WingmanProvider</span>
                    <span style={{ color: '#d4d4d4' }}>{' } '}</span>
                    <span style={{ color: '#c586c0' }}>from</span>
                    <span style={{ color: '#ce9178' }}> 'wingman-sdk'</span>
                    <span style={{ color: '#d4d4d4' }}>;</span>
                    {'\n\n'}
                    <span style={{ color: '#569cd6' }}>function</span>
                    <span style={{ color: '#dcdcaa' }}> App</span>
                    <span style={{ color: '#d4d4d4' }}>() {'{\n  '}</span>
                    <span style={{ color: '#c586c0' }}>return</span>
                    <span style={{ color: '#d4d4d4' }}> (</span>
                    {'\n    '}
                    <span style={{ color: '#4ec9b0' }}>{'<WingmanProvider '}</span>
                    <span style={{ color: '#9cdcfe' }}>config</span>
                    <span style={{ color: '#d4d4d4' }}>=</span>
                    <span style={{ color: '#ce9178' }}>{'{{'}</span>
                    <span style={{ color: '#9cdcfe' }}> debug</span>
                    <span style={{ color: '#d4d4d4' }}>:</span>
                    <span style={{ color: '#569cd6' }}> true</span>
                    <span style={{ color: '#ce9178' }}>{' }}'}</span>
                    <span style={{ color: '#4ec9b0' }}>{'>'}</span>
                    {'\n      '}
                    <span style={{ color: '#608b4e' }}>{'{'}</span>
                    <span style={{ color: '#608b4e' }}>/* Your app components */</span>
                    <span style={{ color: '#608b4e' }}>{'}'}</span>
                    {'\n    '}
                    <span style={{ color: '#4ec9b0' }}>{'</WingmanProvider>'}</span>
                    {'\n  '}
                    <span style={{ color: '#d4d4d4' }}>);</span>
                    {'\n'}
                    <span style={{ color: '#d4d4d4' }}>{'}'}</span>
                    {'\n\n'}
                    <span style={{ color: '#c586c0' }}>export default</span>
                    <span style={{ color: '#dcdcaa' }}> App</span>
                    <span style={{ color: '#d4d4d4' }}>;</span>
                  </code>
                </pre>
              </Box>
            </CodeBlock>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              That's it! The SDK now automatically connects with the Wingman Chrome Extension and provides enhanced React metadata.
            </Typography>
          </Box>

          <Box id="configuration" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Configuration Options
            </Typography>
            <CodeBlock>
              <CopyButton
                size="small"
                onClick={() => handleCopyCode(
                  `<WingmanProvider
  config={{
    enabled: true,           // Enable/disable SDK
    debug: false,           // Console logging
    endpoint: 'http://localhost:8787/annotations',
    oauth: {                // OAuth tunnel support
      routes: ['/auth/*', '/callback'],
      modifyRedirectUri: (uri, tunnelDomain) => {
        return uri.replace(/https?:\\/\\/[^\\/]+/, tunnelDomain);
      }
    }
  }}
>`,
                  'config'
                )}
              >
                {copiedCode === 'config' ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
              </CopyButton>
              <pre>
                <code>{`<WingmanProvider
  config={{
    enabled: true,           // Enable/disable SDK
    debug: false,           // Console logging
    endpoint: 'http://localhost:8787/annotations',
    oauth: {                // OAuth tunnel support
      routes: ['/auth/*', '/callback'],
      modifyRedirectUri: (uri, tunnelDomain) => {
        return uri.replace(/https?:\\/\\/[^\\/]+/, tunnelDomain);
      }
    }
  }}
>`}</code>
              </pre>
            </CodeBlock>
          </Box>

          <Box id="hooks" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Using Hooks
            </Typography>
            <CodeBlock>
              <CopyButton
                size="small"
                onClick={() => handleCopyCode(
                  `import { useWingman } from 'wingman-sdk';

function MyComponent() {
  const {
    config,        // Current configuration
    introspector,  // React introspector instance (internal)
    isActive,      // SDK activation status
    activate,      // Activate SDK programmatically
    deactivate,    // Deactivate SDK programmatically
    sendFeedback   // Send feedback with note and screenshot
  } = useWingman();

  const handleReportIssue = async () => {
    // sendFeedback requires note and screenshot parameters
    await sendFeedback({
      note: 'Button is not responding to clicks',
      screenshot: 'data:image/png;base64,...', // Base64 image data
      metadata: { severity: 'high' }, // Optional metadata
      element: document.querySelector('#submit-btn') // Optional element
    });
  };

  return (
    <div>
      <button onClick={handleReportIssue}>
        Report Issue
      </button>
      <span>SDK Status: {isActive ? 'Active' : 'Inactive'}</span>
    </div>
  );
}`,
                  'hooks'
                )}
              >
                {copiedCode === 'hooks' ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
              </CopyButton>
              <pre>
                <code>{`import { useWingman } from 'wingman-sdk';

function MyComponent() {
  const {
    config,        // Current configuration
    introspector,  // React introspector instance (internal)
    isActive,      // SDK activation status
    activate,      // Activate SDK programmatically
    deactivate,    // Deactivate SDK programmatically
    sendFeedback   // Send feedback with note and screenshot
  } = useWingman();

  const handleReportIssue = async () => {
    // sendFeedback requires note and screenshot parameters
    await sendFeedback({
      note: 'Button is not responding to clicks',
      screenshot: 'data:image/png;base64,...', // Base64 image data
      metadata: { severity: 'high' }, // Optional metadata
      element: document.querySelector('#submit-btn') // Optional element
    });
  };

  return (
    <div>
      <button onClick={handleReportIssue}>
        Report Issue
      </button>
      <span>SDK Status: {isActive ? 'Active' : 'Inactive'}</span>
    </div>
  );
}`}</code>
              </pre>
            </CodeBlock>
          </Box>

          <Box id="oauth" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              OAuth Tunnel Support
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: colors.textSecondary }}>
              For local development with OAuth providers, the SDK automatically detects when you're using tunnels (ngrok, localtunnel, etc.)
              and updates OAuth redirect URIs accordingly.
            </Typography>
            <CodeBlock>
              <pre>
                <code>{`// Automatically handles tunnel detection
<WingmanProvider
  config={{
    oauth: {
      routes: ['/auth/*', '/signin/callback'],
      envOverrides: {
        'VITE_AUTH_REDIRECT': '{tunnelDomain}/callback',
        'NEXT_PUBLIC_REDIRECT_URI': '{tunnelDomain}'
      }
    }
  }}
>`}</code>
              </pre>
            </CodeBlock>
          </Box>

          <Box id="troubleshooting-sdk" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Troubleshooting SDK Issues
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  SDK not detecting components?
                </Typography>
                <ul>
                  <li>Ensure you're wrapping at the root level</li>
                  <li>Check that React DevTools can see your components</li>
                  <li>Try enabling debug mode</li>
                </ul>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  OAuth redirects failing?
                </Typography>
                <ul>
                  <li>Verify your OAuth routes match your provider's callback URLs</li>
                  <li>Check tunnel domain detection with debug logging</li>
                  <li>Ensure envOverrides match your env variable names</li>
                </ul>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Props/State not captured?
                </Typography>
                <ul>
                  <li>React DevTools hook must be available</li>
                  <li>Production builds may optimize away component names</li>
                  <li>Use displayName for better component identification</li>
                </ul>
              </Box>
            </Stack>
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
            What Gets Captured?
          </Typography>
          <CodeBlock>
            <pre>
              <code>{`{
  "id": "wing_abc123xyz",
  "createdAt": "2024-01-15T10:30:45.123Z",
  "note": "Button doesn't respond to clicks on mobile view",

  "page": {
    "url": "https://app.example.com/dashboard",
    "title": "Dashboard - Example App",
    "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    "viewport": {
      "w": 1920,
      "h": 1080,
      "dpr": 2
    }
  },

  "target": {
    "mode": "element",
    "rect": {
      "x": 245,
      "y": 180,
      "width": 120,
      "height": 48
    },
    "selector": "button.MuiButton-root.submit-btn"
  },

  "media": {
    "screenshot": {
      "mime": "image/png",
      "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAA..."
    }
  },

  "console": [
    {
      "level": "error",
      "args": ["Failed to fetch user data", {"status": 403}],
      "ts": 1705316985234
    },
    {
      "level": "warn",
      "args": ["API rate limit approaching"],
      "ts": 1705316975123
    }
  ],

  "errors": [
    {
      "message": "TypeError: Cannot read property 'id' of undefined",
      "stack": "TypeError: Cannot read property 'id' of undefined\\n    at handleClick...",
      "ts": 1705316990567
    }
  ],

  "network": [
    {
      "url": "https://api.example.com/users/profile",
      "status": 403,
      "startTime": 1705316984123,
      "duration": 245,
      "initiatorType": "fetch"
    },
    {
      "url": "https://api.example.com/auth/refresh",
      "status": 200,
      "startTime": 1705316983890,
      "duration": 123,
      "initiatorType": "xmlhttprequest"
    }
  ],

  "react": {
    "componentName": "SubmitButton",
    "componentType": "function",
    "displayName": "SubmitButton",

    "source": {
      "fileName": "/src/components/SubmitButton.tsx",
      "lineNumber": 42,
      "columnNumber": 8
    },

    "componentStack": [
      {
        "name": "SubmitButton",
        "props": {"disabled": false, "loading": true},
        "key": "submit-1"
      },
      {
        "name": "FormActions",
        "props": {"align": "right"},
        "key": null
      },
      {
        "name": "UserForm",
        "props": {"userId": "123"},
        "key": "form-user"
      }
    ],

    "parentComponents": ["UserForm", "FormActions", "Dashboard", "App"],

    "props": {
      "disabled": false,
      "loading": true,
      "onClick": "[Function]",
      "variant": "contained",
      "color": "primary",
      "children": "Submit"
    },

    "state": {
      "isSubmitting": true,
      "hasError": false,
      "attemptCount": 2
    },

    "hooks": [
      {
        "type": "state",
        "name": "useState",
        "value": true,
        "dependencies": []
      },
      {
        "type": "effect",
        "name": "useEffect",
        "dependencies": ["loading", "disabled"]
      },
      {
        "type": "context",
        "name": "useContext",
        "value": {"theme": "dark", "user": {"id": "123"}}
      }
    ],

    "contexts": [
      {
        "displayName": "ThemeContext",
        "value": {"theme": "dark", "toggleTheme": "[Function]"}
      },
      {
        "displayName": "AuthContext",
        "value": {"user": {"id": "123", "email": "user@example.com"}}
      }
    ],

    "renderCount": 5,
    "lastRenderDuration": 12.5,
    "renderReasons": ["Props changed: loading", "State changed: isSubmitting"],

    "errorBoundary": {
      "componentName": "ErrorBoundary",
      "error": null,
      "errorInfo": null
    },

    "fiberType": "FunctionComponent",
    "effectTags": ["Update", "Callback"],

    "obtainedVia": "sdk-bridge"
  }
}`}</code>
            </pre>
          </CodeBlock>
        </DocSection>

        {/* Prompt Templates Section */}
        <DocSection id="templates">
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
            Prompt Templates
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: colors.textSecondary }}>
            Customize how your feedback is formatted for different AI assistants. Templates use Handlebars syntax for dynamic content.
          </Typography>

          <Box id="template-editor" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Accessing the Template Editor
            </Typography>
            <Stack spacing={2}>
              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="body2">1. Click the Wingman extension icon in Chrome</Typography>
              </Paper>
              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="body2">2. Navigate to the Settings tab (gear icon)</Typography>
              </Paper>
              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="body2">3. Scroll down to the "Prompt Template" section</Typography>
              </Paper>
              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="body2">4. Edit the template using Handlebars-style syntax</Typography>
              </Paper>
              <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="body2">5. Click outside the text area to auto-save</Typography>
              </Paper>
            </Stack>
          </Box>

          <Box id="syntax" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Template Syntax
            </Typography>
            <CodeBlock>
              <pre>
                <code>{`{{userNote}}                           # Insert a variable
{{#if hasErrors}}...{{/if}}           # Conditional content
{{#each networkRequests}}...{{/each}}  # Loop through arrays

# Example:
{{#if hasErrors}}
### ⚠️ JavaScript Errors ({{errorCount}})

{{#each errors}}
{{index}}. **[{{timestamp}}]** {{message}}
   {{stack}}
{{/each}}
{{/if}}`}</code>
              </pre>
            </CodeBlock>
          </Box>

          <Box id="variables" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Available Variables
            </Typography>

            <Typography variant="subtitle2" sx={{ mb: 2, color: colors.primary }}>
              Basic Information
            </Typography>
            <Box sx={{ mb: 3 }}>
              <VariableChip label="{{userNote}}" onClick={() => handleCopyCode('{{userNote}}', 'var1')} />
              <VariableChip label="{{pageUrl}}" onClick={() => handleCopyCode('{{pageUrl}}', 'var2')} />
              <VariableChip label="{{pageTitle}}" onClick={() => handleCopyCode('{{pageTitle}}', 'var3')} />
              <VariableChip label="{{capturedAt}}" onClick={() => handleCopyCode('{{capturedAt}}', 'var4')} />
              <VariableChip label="{{screenshotUrl}}" onClick={() => handleCopyCode('{{screenshotUrl}}', 'var5')} />
              <VariableChip label="{{annotationId}}" onClick={() => handleCopyCode('{{annotationId}}', 'var6')} />
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 2, color: colors.primary }}>
              Selection Details
            </Typography>
            <Box sx={{ mb: 3 }}>
              <VariableChip label="{{targetRectX}}" onClick={() => handleCopyCode('{{targetRectX}}', 'var7')} />
              <VariableChip label="{{targetRectY}}" onClick={() => handleCopyCode('{{targetRectY}}', 'var8')} />
              <VariableChip label="{{targetRectWidth}}" onClick={() => handleCopyCode('{{targetRectWidth}}', 'var9')} />
              <VariableChip label="{{targetRectHeight}}" onClick={() => handleCopyCode('{{targetRectHeight}}', 'var10')} />
              <VariableChip label="{{targetSelector}}" onClick={() => handleCopyCode('{{targetSelector}}', 'var11')} />
              <VariableChip label="{{selectionModeText}}" onClick={() => handleCopyCode('{{selectionModeText}}', 'var12')} />
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 2, color: colors.primary }}>
              Viewport Information
            </Typography>
            <Box sx={{ mb: 3 }}>
              <VariableChip label="{{viewportWidth}}" onClick={() => handleCopyCode('{{viewportWidth}}', 'var13')} />
              <VariableChip label="{{viewportHeight}}" onClick={() => handleCopyCode('{{viewportHeight}}', 'var14')} />
              <VariableChip label="{{viewportDpr}}" onClick={() => handleCopyCode('{{viewportDpr}}', 'var15')} />
              <VariableChip label="{{userAgent}}" onClick={() => handleCopyCode('{{userAgent}}', 'var16')} />
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 2, color: colors.primary }}>
              React Information
            </Typography>
            <Box sx={{ mb: 3 }}>
              <VariableChip label="{{reactComponentName}}" onClick={() => handleCopyCode('{{reactComponentName}}', 'var17')} />
              <VariableChip label="{{reactPropsJson}}" onClick={() => handleCopyCode('{{reactPropsJson}}', 'var18')} />
              <VariableChip label="{{reactStateJson}}" onClick={() => handleCopyCode('{{reactStateJson}}', 'var19')} />
              <VariableChip label="{{reactDataSource}}" onClick={() => handleCopyCode('{{reactDataSource}}', 'var20')} />
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 2, color: colors.primary }}>
              Technical Data (Arrays)
            </Typography>
            <Box sx={{ mb: 3 }}>
              <VariableChip label="{{#each errors}}" onClick={() => handleCopyCode('{{#each errors}}', 'var21')} />
              <VariableChip label="{{#each consoleLogs}}" onClick={() => handleCopyCode('{{#each consoleLogs}}', 'var22')} />
              <VariableChip label="{{#each networkRequests}}" onClick={() => handleCopyCode('{{#each networkRequests}}', 'var23')} />
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 2, color: colors.primary }}>
              Conditional Helpers
            </Typography>
            <Box>
              <VariableChip label="{{#if hasErrors}}" onClick={() => handleCopyCode('{{#if hasErrors}}', 'var24')} />
              <VariableChip label="{{#if hasConsole}}" onClick={() => handleCopyCode('{{#if hasConsole}}', 'var25')} />
              <VariableChip label="{{#if hasNetwork}}" onClick={() => handleCopyCode('{{#if hasNetwork}}', 'var26')} />
              <VariableChip label="{{#if hasReact}}" onClick={() => handleCopyCode('{{#if hasReact}}', 'var27')} />
            </Box>
          </Box>

          <Box id="template-examples" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Example Templates
            </Typography>

            <Tabs value={0} sx={{ mb: 2 }}>
              <Tab label="Claude/Cursor" />
              <Tab label="ChatGPT" />
              <Tab label="Minimal" />
              <Tab label="Debug-Heavy" />
            </Tabs>

            <CodeBlock>
              <pre>
                <code>{`# Claude/Cursor Template

## 🎯 UI Feedback Request

{{#if userNote}}
> **{{userNote}}**
{{/if}}

![Screenshot]({{screenshotUrl}})

### Visual Context
{{#if targetSelector}}
- **Element:** \`{{targetSelector}}\`
{{/if}}
{{#if targetRect}}
- **Position:** {{targetRectX}},{{targetRectY}} ({{targetRectWidth}}×{{targetRectHeight}})
{{/if}}

### Page Context
- **URL:** {{pageUrl}}
- **Title:** {{pageTitle}}

{{#if hasReact}}
### Component Info
- **Component:** {{reactComponentName}}
- **Props:** \`{{reactPropsJson}}\`
{{/if}}

{{#if hasErrors}}
### Errors
{{#each errors}}
- {{message}}
{{/each}}
{{/if}}`}</code>
              </pre>
            </CodeBlock>
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              💡 <strong>Tip:</strong> Use the "Reset to Default" button in settings if your template becomes corrupted
            </Typography>
          </Alert>
        </DocSection>

        {/* API Reference Section */}
        <DocSection id="api">
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
            API Reference
          </Typography>

          <Box id="data-structure" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              WingmanAnnotation Interface
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: colors.textSecondary }}>
              The complete TypeScript interface for annotation data:
            </Typography>
            <CodeBlock>
              <pre>
                <code>{`interface WingmanAnnotation {
  id: string;
  createdAt: string; // ISO 8601
  note: string;

  page: {
    url: string;
    title: string;
    ua: string;
    viewport: { w: number; h: number; dpr: number };
  };

  target: {
    mode: 'element' | 'region';
    rect?: { x: number; y: number; width: number; height: number };
    selector?: string;
  };

  media: {
    screenshot: {
      mime: 'image/png' | 'image/jpeg';
      dataUrl: string;
    };
  };

  console: Array<{
    level: 'log' | 'info' | 'warn' | 'error';
    args: any[];
    ts: number;
  }>;

  errors: Array<{
    message: string;
    stack?: string;
    ts: number;
  }>;

  network: Array<{
    url: string;
    status?: number;
    startTime?: number;
    duration?: number;
    initiatorType?: string;
  }>;

  react?: {
    componentName?: string;
    componentType?: string;
    displayName?: string;
    source?: {
      fileName?: string;
      lineNumber?: number;
      columnNumber?: number;
    };
    componentStack?: Array<{
      name: string;
      props?: any;
      key?: string | number;
    }>;
    parentComponents?: string[];
    props?: any;
    state?: any;
    hooks?: Array<{
      type: string;
      name?: string;
      value?: any;
      dependencies?: any[];
    }>;
    contexts?: Array<{
      displayName?: string;
      value: any;
    }>;
    renderCount?: number;
    lastRenderDuration?: number;
    renderReasons?: string[];
    errorBoundary?: {
      componentName: string;
      error?: string;
      errorInfo?: any;
    };
    fiberType?: string;
    effectTags?: string[];
    obtainedVia: 'devtools-hook' | 'fiber-direct' | 'sdk-bridge' | 'none';
  };
}`}</code>
              </pre>
            </CodeBlock>
          </Box>

          <Box id="chrome-apis" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Chrome Extension APIs
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: colors.textSecondary }}>
              Key Chrome APIs used by the extension:
            </Typography>
            <Stack spacing={2}>
              <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="subtitle2" sx={{ color: colors.primary }}>
                  chrome.commands
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                  Registers keyboard shortcuts like ⌘+Shift+K
                </Typography>
              </Paper>
              <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="subtitle2" sx={{ color: colors.primary }}>
                  chrome.tabs.captureVisibleTab()
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                  Captures screenshot of the visible area
                </Typography>
              </Paper>
              <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="subtitle2" sx={{ color: colors.primary }}>
                  chrome.runtime.sendMessage()
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                  Communication between content script and background
                </Typography>
              </Paper>
              <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="subtitle2" sx={{ color: colors.primary }}>
                  chrome.storage.local
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                  Stores settings and temporary data
                </Typography>
              </Paper>
            </Stack>
          </Box>

          <Box id="endpoints" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Server Endpoints (Coming Soon)
            </Typography>
            <Alert severity="info">
              <Typography variant="body2">
                Server mode endpoints will be available in a future release:
                <br />• <code>POST /annotations</code> - Submit annotation
                <br />• <code>GET /annotations/:id</code> - Retrieve annotation
                <br />• <code>GET /annotations/:id/screenshot</code> - Get screenshot
              </Typography>
            </Alert>
          </Box>
        </DocSection>

        {/* Guides Section */}
        <DocSection id="guides">
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
            Guides
          </Typography>

          <Box id="best-practices" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Best Practices
            </Typography>
            <Stack spacing={2}>
              <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Be Specific in Feedback
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                  Describe what's wrong and what should happen instead. Include steps to reproduce if the issue isn't immediately visible.
                </Typography>
              </Paper>
              <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Select Exact Elements
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                  Click on the specific element having issues rather than selecting a large region for more accurate CSS selectors.
                </Typography>
              </Paper>
              <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Enable Console Logging
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                  Keep console logs enabled in settings when debugging JavaScript issues for better context.
                </Typography>
              </Paper>
              <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Use SDK for React Apps
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                  Install the wingman-sdk in React applications to capture component props, state, and render information.
                </Typography>
              </Paper>
            </Stack>
          </Box>

          <Box id="privacy" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              <SecurityOutlined sx={{ mr: 1, verticalAlign: 'middle' }} />
              Privacy & Data Handling
            </Typography>

            <Typography variant="subtitle2" sx={{ mb: 2, color: colors.primary }}>
              What Data is Collected
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: colors.textSecondary }}>
              When you capture feedback, Wingman collects:
            </Typography>
            <ul>
              <li>Screenshot of the visible tab</li>
              <li>URL and page title</li>
              <li>Selected element information</li>
              <li>Console logs (last 50 entries)</li>
              <li>Network requests (last 25 entries)</li>
              <li>JavaScript errors</li>
              <li>React component data (if SDK is installed)</li>
            </ul>

            <Typography variant="subtitle2" sx={{ mb: 2, mt: 3, color: colors.primary }}>
              Data Storage
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                In Clipboard Mode, all data stays on your device. Screenshots are saved locally to Downloads folder.
              </Typography>
            </Alert>

            <Typography variant="subtitle2" sx={{ mb: 2, mt: 3, color: colors.primary }}>
              Data Limits
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">• Console logs: Last 50 entries (10 shown in template)</Typography>
              <Typography variant="body2">• Network requests: Last 25 entries (8 shown in template)</Typography>
              <Typography variant="body2">• Errors: Last 50 entries (5 shown in template)</Typography>
              <Typography variant="body2">• Screenshot: Current viewport only</Typography>
            </Stack>
          </Box>

          <Box id="troubleshooting" sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              <BugReportOutlined sx={{ mr: 1, verticalAlign: 'middle' }} />
              Troubleshooting
            </Typography>

            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Extension Not Working?
                </Typography>
                <ul>
                  <li>Refresh the page after installing the extension</li>
                  <li>Check permissions - the extension needs access to the current tab</li>
                  <li>Disable conflicting extensions that might interfere with overlays</li>
                  <li>Update Chrome to the latest version</li>
                </ul>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Screenshot Issues
                </Typography>
                <ul>
                  <li><strong>Black screenshots:</strong> Some sites block screenshot capture. Try using region selection instead</li>
                  <li><strong>Missing elements:</strong> Dynamic content might not be captured. Wait for page to fully load</li>
                  <li><strong>Large screenshots:</strong> Files are saved to Downloads folder, check available disk space</li>
                </ul>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Template Not Updating?
                </Typography>
                <ul>
                  <li>Changes are auto-saved when you click outside the text area</li>
                  <li>Use "Reset to Default" if the template becomes corrupted</li>
                  <li>Check for syntax errors in Handlebars expressions</li>
                </ul>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ color: colors.primary, mb: 1 }}>
                  Keyboard Shortcuts Not Working?
                </Typography>
                <ul>
                  <li>Check if another extension is using the same shortcut</li>
                  <li>Go to chrome://extensions/shortcuts to customize</li>
                  <li>Some websites may override keyboard shortcuts</li>
                </ul>
              </Box>
            </Stack>
          </Box>
        </DocSection>
      </>
    );
  };

  return (
    <DocContainer>
      <Sidebar>
        <Box sx={{ p: 3 }}>
          <SearchField
            fullWidth
            size="small"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <List>
            {navigationItems.map((item) => (
              <Box key={item.id}>
                <NavItem
                  active={activeSection === item.id}
                  onClick={() => toggleSection(item.id)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={activeSection === item.id ? 600 : 400}>
                        {item.label}
                      </Typography>
                    }
                  />
                  {expandedSections.includes(item.id) ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                </NavItem>
                <Collapse in={expandedSections.includes(item.id)}>
                  <List sx={{ pl: 2 }}>
                    {item.sections.map((section) => (
                      <ListItem
                        key={section}
                        sx={{
                          py: 0.5,
                          pl: 4,
                          cursor: 'pointer',
                          '&:hover': {
                            color: colors.primary,
                          },
                        }}
                        onClick={() => scrollToSection(section)}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="caption">
                              {section.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </Box>
            ))}
          </List>
        </Box>
      </Sidebar>

      {/* Main Content Area */}
      <MainContent ref={contentRef}>
        {renderContent()}
      </MainContent>

      {/* Mobile Menu Button */}
      <IconButton
        sx={{
          display: { xs: 'block', md: 'none' },
          position: 'fixed',
          top: 16,
          left: 16,
          bgcolor: 'background.paper',
          boxShadow: 2,
        }}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <MenuIcon />
      </IconButton>
    </DocContainer>
  );
}