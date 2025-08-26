/**
 * Design system constants for Wingman webapp
 * Inspired by wingmanux.com elegant design
 */

export const colors = {
  primary: '#0084ff',
  primaryHover: '#0073e6',
  purple: '#8b5cf6',
  success: '#10b981',
  error: '#ef4444',
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  borderColor: '#e2e8f0',
};

export const gradients = {
  primary: 'linear-gradient(135deg, #0084ff, #8b5cf6)',
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  text: 'linear-gradient(135deg, #0084ff, #8b5cf6)',
};

export const effects = {
  glassmorphism: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: `
      0 10px 40px -10px rgba(0, 132, 255, 0.15),
      0 0 0 1px rgba(255, 255, 255, 0.5) inset
    `.trim(),
  },
  frostedGlass: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
};

export const animations = {
  fadeIn: `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  pulseHealthy: `
    @keyframes pulseHealthy {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
      }
    }
  `,
  pulseError: `
    @keyframes pulseError {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
      }
    }
  `,
};

export const typography = {
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
  mono: `'Courier New', monospace`,
};