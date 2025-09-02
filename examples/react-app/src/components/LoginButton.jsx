import { useAuth } from '../auth/AuthContext';

export default function LoginButton({ provider, children }) {
  const { login, loading } = useAuth();

  const handleLogin = () => {
    console.log(`[LoginButton] Initiating ${provider} OAuth flow`);
    login(provider);
  };

  return (
    <button 
      onClick={handleLogin}
      disabled={loading}
      className="login-button"
      style={{
        padding: '12px 24px',
        fontSize: '16px',
        borderRadius: '8px',
        border: 'none',
        background: provider === 'google' ? '#4285f4' : '#0078d4',
        color: 'white',
        cursor: 'pointer',
        margin: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '200px',
        justifyContent: 'center'
      }}
    >
      {provider === 'google' && '🌐'}
      {provider === 'microsoft' && '🏢'}
      {children || `Sign in with ${provider}`}
    </button>
  );
}