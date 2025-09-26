import { useState } from 'react';
import { Box, Typography, Container, TextField, Button, Paper, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';
import { colors, gradients, effects, animations } from '../styles/theme';

const AnimatedContainer = styled(Container)({
  textAlign: 'center',
  animation: 'fadeIn 0.8s ease-out',
  position: 'relative',
  zIndex: 1,
  paddingTop: '80px',
  paddingBottom: '40px',
});

const LogoBrandContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  marginBottom: '24px',
  position: 'relative',
});

const LogoContainer = styled(Box)({
  width: '80px',
  height: '80px',
  ...effects.frostedGlass,
  borderRadius: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  animation: 'slideInLogo 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  opacity: 0,
});

const GradientHeading = styled(Typography)({
  fontSize: '2.5em',
  fontWeight: 700,
  letterSpacing: '-1px',
  background: gradients.text,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  margin: 0,
  animation: 'slideInText 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards',
  opacity: 0,
});

const SignupCard = styled(Paper)({
  ...effects.glassmorphism,
  borderRadius: '16px',
  padding: '40px',
  maxWidth: '500px',
  margin: '32px auto',
  animation: 'fadeIn 1s ease-out 0.4s forwards',
  opacity: 0,
});

const GradientButton = styled(Button)({
  background: gradients.primary,
  color: 'white',
  padding: '14px 32px',
  borderRadius: '12px',
  fontWeight: 600,
  fontSize: '1rem',
  textTransform: 'none',
  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  '&:hover': {
    background: gradients.primary,
    transform: 'scale(1.05)',
    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
  },
  '&:disabled': {
    background: colors.bgSecondary,
    color: colors.textMuted,
  },
});

const SuccessMessage = styled(Box)({
  ...effects.glassmorphism,
  borderRadius: '12px',
  padding: '24px',
  maxWidth: '500px',
  margin: '32px auto',
  background: 'rgba(76, 175, 80, 0.1)',
  border: '1px solid rgba(76, 175, 80, 0.3)',
  animation: 'fadeIn 0.6s ease-out',
});

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
`;
if (!document.querySelector('style[data-wingman-beta-animations]')) {
  style.setAttribute('data-wingman-beta-animations', 'true');
  document.head.appendChild(style);
}

export default function BetaSignup() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    // Store email in localStorage for now
    const existingEmails = JSON.parse(localStorage.getItem('wingman-beta-emails') || '[]');
    if (!existingEmails.includes(email)) {
      existingEmails.push(email);
      localStorage.setItem('wingman-beta-emails', JSON.stringify(existingEmails));
    }

    setSubmitted(true);
    setError('');
  };

  return (
    <AnimatedContainer maxWidth="md">
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
        variant="h4"
        sx={{
          marginBottom: '16px',
          color: colors.textPrimary,
          fontWeight: 600
        }}
      >
        Join the Beta
      </Typography>

      <Typography
        variant="body1"
        sx={{
          marginBottom: '32px',
          color: colors.textSecondary,
          maxWidth: '600px',
          margin: '0 auto 32px'
        }}
      >
        Wingman is free to use. We're working on premium features including cloud sync,
        team collaboration, and advanced feedback workflows. Sign up to be notified when they launch.
      </Typography>

      {!submitted ? (
        <SignupCard elevation={0}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!error}
                helperText={error}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    '& fieldset': {
                      borderColor: colors.borderColor,
                    },
                    '&:hover fieldset': {
                      borderColor: colors.primary,
                    },
                  },
                }}
              />

              <GradientButton
                type="submit"
                variant="contained"
                fullWidth
              >
                Request Access
              </GradientButton>

              <Typography
                variant="caption"
                sx={{
                  color: colors.textMuted,
                  textAlign: 'center',
                  display: 'block'
                }}
              >
                We'll notify you when new features are available
              </Typography>
            </Stack>
          </form>
        </SignupCard>
      ) : (
        <SuccessMessage>
          <Typography
            variant="h6"
            sx={{
              color: 'rgb(76, 175, 80)',
              fontWeight: 600,
              marginBottom: '8px'
            }}
          >
            ✓ You're on the list!
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: colors.textSecondary
            }}
          >
            We'll send you an email at <strong>{email}</strong> when new features are ready.
          </Typography>
        </SuccessMessage>
      )}

      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: colors.textMuted, fontSize: '0.85em' }}>
          Already have the Chrome extension? <a href="/install" style={{ color: colors.primary, textDecoration: 'none' }}>Get started</a>
        </Typography>
      </Box>
    </AnimatedContainer>
  );
}