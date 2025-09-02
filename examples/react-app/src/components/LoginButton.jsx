import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function LoginButton({ provider, children }) {
  const { loading } = useAuth();
  const buttonRef = useRef(null);

  useEffect(() => {
    if (provider === 'google' && window.google && buttonRef.current) {
      // Render Google sign-in button using vanilla Google Identity API
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 250
      });
      console.log('[LoginButton] Google sign-in button rendered');
    }
  }, [provider, window.google]);

  if (provider === 'google') {
    return (
      <div style={{ margin: '8px' }}>
        <div ref={buttonRef}></div>
      </div>
    );
  }

  // For other providers, show not implemented message
  return (
    <div style={{ 
      margin: '8px',
      padding: '12px 24px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      color: '#666',
      textAlign: 'center',
      border: '1px dashed #ccc'
    }}>
      {provider} OAuth not implemented in this demo
    </div>
  );
}