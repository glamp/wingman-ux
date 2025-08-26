/**
 * Design system constants for Wingman webapp
 * Inspired by wingmanux.com elegant design
 */

export const colors = {
  primary: '#0084ff',
  primaryHover: '#0073e6',
  purple: '#8b5cf6',
  purpleHover: '#7c3aed',
  success: '#10b981',
  successHover: '#059669',
  warning: '#f59e0b',
  warningHover: '#d97706',
  error: '#ef4444',
  errorHover: '#dc2626',
  info: '#06b6d4',
  infoHover: '#0891b2',
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  borderColor: '#e2e8f0',
  // Additional vibrant accent colors
  coral: '#ff6b6b',
  teal: '#14b8a6',
  indigo: '#6366f1',
  pink: '#ec4899',
  amber: '#fbbf24',
  emerald: '#34d399',
};

export const gradients = {
  primary: 'linear-gradient(135deg, #0084ff, #8b5cf6)',
  secondary: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
  success: 'linear-gradient(135deg, #10b981, #14b8a6)',
  warning: 'linear-gradient(135deg, #f59e0b, #ff6b6b)',
  error: 'linear-gradient(135deg, #ef4444, #ec4899)',
  info: 'linear-gradient(135deg, #06b6d4, #0084ff)',
  sunset: 'linear-gradient(135deg, #ff6b6b, #fbbf24)',
  ocean: 'linear-gradient(135deg, #06b6d4, #14b8a6)',
  aurora: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  text: 'linear-gradient(135deg, #0084ff, #8b5cf6)',
  card: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)',
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
  cardGradient: {
    background: '#ffffff',
    backgroundColor: '#ffffff',
    border: 'none',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  neonGlow: {
    boxShadow: `
      0 0 20px rgba(139, 92, 246, 0.5),
      0 0 40px rgba(139, 92, 246, 0.3),
      0 0 60px rgba(139, 92, 246, 0.1)
    `.trim(),
  },
  colorfulShadow: {
    blue: '0 10px 40px -10px rgba(0, 132, 255, 0.4)',
    purple: '0 10px 40px -10px rgba(139, 92, 246, 0.4)',
    pink: '0 10px 40px -10px rgba(236, 72, 153, 0.4)',
    teal: '0 10px 40px -10px rgba(20, 184, 166, 0.4)',
    coral: '0 10px 40px -10px rgba(255, 107, 107, 0.4)',
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
  pulsePurple: `
    @keyframes pulsePurple {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(139, 92, 246, 0);
      }
    }
  `,
  shimmer: `
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `,
  glow: `
    @keyframes glow {
      0%, 100% {
        filter: brightness(1) drop-shadow(0 0 5px rgba(139, 92, 246, 0.5));
      }
      50% {
        filter: brightness(1.1) drop-shadow(0 0 20px rgba(139, 92, 246, 0.8));
      }
    }
  `,
};

export const typography = {
  fontFamily: `'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
  mono: `'Space Mono', 'Courier New', monospace`,
};