import { Box, Typography, Container, Chip, Paper, Button, Grid, Card } from '@mui/material';
import { useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ChromeExtension from '../components/ChromeExtension';
import { colors, gradients, effects, animations, typography } from '../styles/theme';
import {
  Speed,
  BugReport,
  Code,
  Extension,
  Security,
  GitHub,
  ArrowForward,
  CheckCircle,
  Cancel,
  Psychology,
  FlashOn,
  Lock,
  AllInclusive,
  Keyboard,
  Timer,
  AutoFixHigh
} from '@mui/icons-material';

/**
 * Full-width section container
 */
const Section = styled(Box)(({ theme }) => ({
  padding: '80px 0',
  position: 'relative',
  background: colors.bgPrimary,
  '&.alt-background': {
    background: 'rgba(248, 250, 252, 1)',
  },
}));

/**
 * Animated container
 */
const AnimatedContainer = styled(Container)({
  animation: 'fadeIn 0.8s ease-out',
  position: 'relative',
  zIndex: 1,
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
 * Main heading with gradient text - hero style
 */
const HeroHeading = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(2.5rem, 5vw, 4rem)',
  fontWeight: 800,
  letterSpacing: '-2px',
  lineHeight: 1.1,
  background: gradients.text,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  marginBottom: '24px',
  animation: 'slideInText 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards',
  opacity: 0,
}));

/**
 * Subheadline text
 */
const Subheading = styled(Typography)({
  fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
  color: colors.textSecondary,
  fontWeight: 400,
  lineHeight: 1.5,
  marginBottom: '40px',
  maxWidth: '600px',
  margin: '0 auto 40px',
});

/**
 * Primary CTA button
 */
const PrimaryButton = styled(Button)({
  background: gradients.primary,
  color: 'white',
  padding: '16px 32px',
  fontSize: '1.1rem',
  fontWeight: 600,
  borderRadius: '100px',
  textTransform: 'none',
  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 30px rgba(102, 126, 234, 0.5)',
    background: gradients.primary,
  },
});

/**
 * Secondary CTA button
 */
const SecondaryButton = styled(Button)({
  color: colors.primary,
  padding: '16px 32px',
  fontSize: '1.1rem',
  fontWeight: 600,
  borderRadius: '100px',
  textTransform: 'none',
  border: `2px solid ${colors.primary}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'rgba(102, 126, 234, 0.1)',
    transform: 'translateY(-2px)',
  },
});

/**
 * Trust badge
 */
const TrustBadge = styled(Chip)({
  background: 'rgba(76, 175, 80, 0.1)',
  color: '#4CAF50',
  border: '1px solid rgba(76, 175, 80, 0.3)',
  padding: '6px 12px',
  height: 'auto',
  '& .MuiChip-label': {
    fontSize: '0.9rem',
    fontWeight: 500,
  },
});

/**
 * Comparison card
 */
const ComparisonCard = styled(Card)({
  padding: '32px',
  height: '100%',
  position: 'relative',
  borderRadius: '16px',
  transition: 'all 0.3s ease',
  '&.before': {
    background: 'linear-gradient(135deg, #FFF5F5 0%, #FFEBEE 100%)',
    border: '2px solid #FFCDD2',
  },
  '&.after': {
    background: 'linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%)',
    border: '2px solid #C8E6C9',
  },
});

/**
 * Feature card
 */
const FeatureCard = styled(Card)({
  ...effects.glassmorphism,
  padding: '32px',
  height: '100%',
  borderRadius: '16px',
  textAlign: 'center',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 20px 40px rgba(0, 132, 255, 0.15)',
  },
});

/**
 * Video demo section with glassmorphic effect - side by side layout
 */
const VideoDemoSection = styled(Paper)({
  ...effects.glassmorphism,
  borderRadius: '16px',
  padding: '32px',
  marginTop: '32px',
  marginBottom: '32px',
  animation: 'fadeIn 1s ease-out 0.6s forwards',
  opacity: 0,
  display: 'flex',
  gap: '32px',
  alignItems: 'center',
  '@media (max-width: 900px)': {
    flexDirection: 'column',
  },
});

/**
 * Video placeholder container with 16:9 aspect ratio
 */
const VideoPlaceholder = styled(Box)({
  position: 'relative',
  width: '100%',
  paddingBottom: '56.25%', // 16:9 aspect ratio
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  borderRadius: '12px',
  overflow: 'hidden',
  border: `1px solid ${colors.borderColor}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

/**
 * Video placeholder content - horizontal layout
 */
const VideoPlaceholderContent = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
  padding: '24px',
});

/**
 * Play button overlay
 */
const PlayButton = styled(Box)({
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  background: gradients.primary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  '&:hover': {
    transform: 'scale(1.1)',
    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.5)',
  },
  '&::after': {
    content: '""',
    width: '0',
    height: '0',
    borderLeft: '20px solid white',
    borderTop: '12px solid transparent',
    borderBottom: '12px solid transparent',
    marginLeft: '4px',
  },
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
      transform: translateY(20px) scale(0.95);
      opacity: 0;
    }
    100% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @keyframes pulseGlow {
    0%, 100% {
      filter: brightness(1);
      transform: scale(1);
    }
    50% {
      filter: brightness(1.2) drop-shadow(0 0 30px rgba(102, 126, 234, 0.6));
      transform: scale(1.05);
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

  @keyframes fadeInUp {
    0% {
      opacity: 0;
      transform: translateY(30px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes scaleIn {
    0% {
      opacity: 0;
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes slideInFromLeft {
    0% {
      opacity: 0;
      transform: translateX(-100px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInFromRight {
    0% {
      opacity: 0;
      transform: translateX(100px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .animate-on-scroll {
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .animate-on-scroll.visible {
    opacity: 1;
    transform: translateY(0);
  }
`;
if (!document.querySelector('style[data-wingman-animations]')) {
  style.setAttribute('data-wingman-animations', 'true');
  document.head.appendChild(style);
}

/**
 * Home page with enterprise-grade design
 */
export default function Home() {
  const navigate = useNavigate();

  // Setup intersection observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    // Observe all sections and cards
    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Hero Section */}
      <Section sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
        <AnimatedContainer maxWidth="lg">
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {/* Logo - Larger and more prominent */}
            <Box sx={{ mb: 3 }}>
              <img
                src="/wingman.png"
                alt="Wingman"
                style={{
                  width: '120px',
                  height: '120px',
                  animation: 'pulseGlow 3s ease-in-out infinite'
                }}
              />
            </Box>

            {/* Main headline with integrated pain point */}
            <HeroHeading variant="h1">
              Stop going 10 rounds with AI{' '}
              <span style={{ color: 'inherit', WebkitTextFillColor: 'initial' }}>🥊</span>
              <br />
              on every UI fix
            </HeroHeading>

            {/* Subheadline */}
            <Subheading variant="h5" sx={{ mb: 4 }}>
              Wingman captures actual React state and props, so AI understands your UI the first time.
              Point, click, fix — no back-and-forth.
            </Subheading>

            {/* CTA Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
              <PrimaryButton
                startIcon={<Extension />}
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/wingman-chrome-extension.crx';
                  link.download = 'wingman-chrome-extension.crx';
                  link.click();
                }}
              >
                Install Chrome Extension
              </PrimaryButton>
              <SecondaryButton
                startIcon={<Code />}
                onClick={() => window.open('https://github.com/YOUR_REPO', '_blank')}
              >
                View on GitHub
              </SecondaryButton>
            </Box>

            {/* Trust indicators */}
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <TrustBadge icon={<CheckCircle />} label="Free Forever" />
              <TrustBadge icon={<GitHub />} label="Open Source" />
              <TrustBadge icon={<Lock />} label="Privacy First" />
              <TrustBadge icon={<Timer />} label="30-Second Setup" />
            </Box>
          </Box>
        </AnimatedContainer>
      </Section>

      {/* Problem/Solution Section */}
      <Section className="alt-background">
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, background: gradients.text, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Stop wasting time on UI feedback
            </Typography>
            <Typography variant="h6" sx={{ color: colors.textSecondary }}>
              Transform your bug-fixing workflow from hours to minutes
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <ComparisonCard className="before">
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Cancel sx={{ fontSize: 40, color: '#f44336', mr: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Before Wingman
                  </Typography>
                </Box>
                <Box component="ul" sx={{ pl: 3, '& li': { mb: 2, color: colors.textSecondary } }}>
                  <li>Screenshots lost in Slack threads</li>
                  <li>Vague bug descriptions</li>
                  <li>Hours reproducing issues</li>
                  <li>Context switching between tools</li>
                  <li>Manual DOM inspection</li>
                  <li>Incomplete error reports</li>
                </Box>
              </ComparisonCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <ComparisonCard className="after">
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <CheckCircle sx={{ fontSize: 40, color: '#4CAF50', mr: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    With Wingman
                  </Typography>
                </Box>
                <Box component="ul" sx={{ pl: 3, '& li': { mb: 2, color: colors.textSecondary } }}>
                  <li>Visual capture with full context</li>
                  <li>AI-ready prompts generated instantly</li>
                  <li>One-click issue reproduction</li>
                  <li>Stay in your development flow</li>
                  <li>Automatic metadata extraction</li>
                  <li>Complete error & console logs</li>
                </Box>
              </ComparisonCard>
            </Grid>
          </Grid>
        </Container>
      </Section>

      {/* How It Works */}
      <Section>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, background: gradients.text, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Three steps to faster fixes
            </Typography>
            <Typography variant="h6" sx={{ color: colors.textSecondary }}>
              From bug report to fixed code in under a minute
            </Typography>
          </Box>

          <Grid container spacing={4} sx={{ position: 'relative' }}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: gradients.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'white',
                }}>
                  1
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                  Capture
                </Typography>
                <Typography sx={{ color: colors.textSecondary }}>
                  Click any element on the page. Wingman captures the screenshot, DOM structure, and all relevant context automatically.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: gradients.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'white',
                }}>
                  2
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                  Annotate
                </Typography>
                <Typography sx={{ color: colors.textSecondary }}>
                  Add a quick description of the issue. Draw on the screenshot, highlight problem areas, or add notes.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: gradients.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'white',
                }}>
                  3
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                  Fix with AI
                </Typography>
                <Typography sx={{ color: colors.textSecondary }}>
                  Copy the generated prompt to Claude, ChatGPT, or Cursor. Get working code that fixes the exact issue.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Section>

      {/* Features Grid */}
      <Section className="alt-background">
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, background: gradients.text, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Built for modern development
            </Typography>
            <Typography variant="h6" sx={{ color: colors.textSecondary }}>
              Everything you need to ship pixel-perfect UIs
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <FeatureCard>
                <FlashOn sx={{ fontSize: 48, color: colors.primary, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Zero Friction
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  Install and use immediately. No configuration, no signup, no BS. Just works.
                </Typography>
              </FeatureCard>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FeatureCard>
                <Psychology sx={{ fontSize: 48, color: colors.primary, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  AI-Ready Output
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  Perfectly formatted prompts for Claude, ChatGPT, or any AI coding assistant.
                </Typography>
              </FeatureCard>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FeatureCard>
                <AutoFixHigh sx={{ fontSize: 48, color: colors.primary, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Full Context Capture
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  Screenshots, console logs, network timing, React props — everything you need.
                </Typography>
              </FeatureCard>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FeatureCard>
                <Lock sx={{ fontSize: 48, color: colors.primary, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Privacy First
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  Your data never leaves your machine. Open source and fully auditable.
                </Typography>
              </FeatureCard>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FeatureCard>
                <AllInclusive sx={{ fontSize: 48, color: colors.primary, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Framework Agnostic
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  Works on any website, any stack. React, Vue, Angular, vanilla JS — we got you.
                </Typography>
              </FeatureCard>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FeatureCard>
                <Speed sx={{ fontSize: 48, color: colors.primary, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  30-Second Feedback Loop
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  From bug report to fixed code faster than making coffee.
                </Typography>
              </FeatureCard>
            </Grid>
          </Grid>
        </Container>
      </Section>

      {/* Developer Experience Section */}
      <Section>
        <Container maxWidth="lg">
          <Box sx={{ mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, background: gradients.text, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Built for developers who ship fast
            </Typography>
            <Typography variant="h6" sx={{ color: colors.textSecondary }}>
              Integrates seamlessly with your existing workflow
            </Typography>
          </Box>

          <Grid container spacing={4} alignItems="flex-start">
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                  The only tool that captures React state AND props
                </Typography>
                <Typography sx={{ color: colors.textSecondary, mb: 3 }}>
                  Wingman doesn't just capture screenshots — it extracts actual React component state, props, and the full component tree. This gives AI the complete context needed to fix issues accurately.
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Keyboard sx={{ color: colors.primary }} />
                  <Typography variant="body1">
                    Quick access: <Chip label="Alt+Shift+K" size="small" sx={{ mx: 1 }} /> (Mac: Cmd+Shift+K)
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Timer sx={{ color: colors.primary }} />
                  <Typography variant="body1">
                    🥊 Stop going <strong>10 rounds</strong> with AI on every button fix
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Psychology sx={{ color: colors.primary }} />
                  <Typography variant="body1">
                    Works with <strong>Claude, ChatGPT, Cursor</strong> and any AI tool
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  background: colors.bgSecondary,
                  border: `1px solid ${colors.borderColor}`,
                  fontFamily: typography.mono,
                  fontSize: '0.9rem',
                  overflow: 'auto'
                }}
              >
                <Typography component="pre" sx={{ margin: 0, fontFamily: 'inherit' }}>
{`{
  "id": "wingman-7b4a9c",
  "note": "Button overflows container on mobile",
  "page": {
    "url": "https://app.example.com/dashboard",
    "title": "Dashboard | Example App",
    "viewport": { "w": 375, "h": 667, "dpr": 2 }
  },
  "target": {
    "mode": "element",
    "selector": "button.primary-cta"
  },
  "react": {  // 🎯 This is what makes Wingman unique!
    "componentName": "CTAButton",
    "props": {
      "text": "Get Started with Premium Today",
      "size": "large",
      "variant": "primary"
    },
    "state": {  // Actual React state, not just hooks!
      "useState0": false,  // isHovered
      "useState1": 0,      // clickCount
      "useState2": "idle"  // loadingState
    },
    "parentComponents": ["Dashboard", "HeroSection"]
  }
}`}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Section>

      {/* Video Demo Section - Simplified */}
      <Section>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                mb: 2,
                background: gradients.text,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Watch Wingman in Action
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: colors.textSecondary,
                mb: 4
              }}
            >
              See how to go from bug report to fixed code in minutes
            </Typography>

            <VideoPlaceholder sx={{ maxWidth: '100%' }}>
              <VideoPlaceholderContent>
                <PlayButton />
                <Box>
                  <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 600 }}>
                    Demo Video Coming Soon
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 1 }}>
                    We're preparing a demo to show you the power of React state capture
                  </Typography>
                </Box>
              </VideoPlaceholderContent>
            </VideoPlaceholder>
          </Box>
        </Container>
      </Section>

      {/* Final CTA Section */}
      <Section sx={{
        background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, rgba(102, 126, 234, 0.05) 100%)`,
        textAlign: 'center'
      }}>
        <Container maxWidth="md">
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 3,
              background: gradients.text,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Start fixing bugs faster. Today.
          </Typography>
          <Typography variant="h6" sx={{ color: colors.textSecondary, mb: 4 }}>
            Join thousands of developers shipping better UIs with Wingman
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 4 }}>
            <PrimaryButton
              size="large"
              startIcon={<Extension />}
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/wingman-chrome-extension.crx';
                link.download = 'wingman-chrome-extension.crx';
                link.click();
              }}
            >
              Install Chrome Extension — Free
            </PrimaryButton>
            <SecondaryButton
              size="large"
              onClick={() => navigate('/install')}
            >
              Installation Guide
            </SecondaryButton>
          </Box>

          <Typography variant="body2" sx={{ color: colors.textMuted }}>
            Free forever for individual developers. No credit card required.
          </Typography>
        </Container>
      </Section>

      {/* Footer */}
      <Box sx={{
        py: 4,
        textAlign: 'center',
        borderTop: `1px solid ${colors.borderColor}`,
        background: colors.bgPrimary
      }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 2 }}>
            <Button
              sx={{ color: colors.textSecondary }}
              onClick={() => navigate('/docs')}
            >
              Documentation
            </Button>
            <Button
              sx={{ color: colors.textSecondary }}
              onClick={() => window.open('https://github.com/YOUR_REPO', '_blank')}
              startIcon={<GitHub />}
            >
              GitHub
            </Button>
            <Button
              sx={{ color: colors.textSecondary }}
              onClick={() => navigate('/status')}
            >
              Status
            </Button>
            <Button
              sx={{ color: colors.textSecondary }}
              onClick={() => navigate('/changelog')}
            >
              Changelog
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <Typography variant="body2" sx={{ color: colors.textMuted, fontSize: '0.85em' }}>
              © {new Date().getFullYear()} Wingman · Made in Colorado
            </Typography>
            <img
              src="/colorado-flag.svg"
              alt="Colorado Flag"
              style={{
                width: '20px',
                height: '13px',
                marginLeft: '4px'
              }}
            />
          </Box>
        </Container>
      </Box>
    </>
  );
}