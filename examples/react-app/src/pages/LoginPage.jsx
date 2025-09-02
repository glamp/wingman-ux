import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import LoginButton from '../components/LoginButton';

export default function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to protected page if already logged in
    if (user) {
      navigate('/protected');
    }
  }, [user, navigate]);

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '0 auto', 
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      <h1>Welcome Back</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>
        Select your authentication provider.
      </p>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center' 
      }}>
        <LoginButton provider="google">
          🌐 Sign in with Google
        </LoginButton>
      </div>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        backgroundColor: '#f0f8ff', 
        borderRadius: '8px',
        textAlign: 'left'
      }}>
        <h3>🔧 OAuth Demo Info</h3>
        <p><strong>Tunnel Domain:</strong> {window.location.origin}</p>
        <p><strong>Callback URLs:</strong></p>
        <ul style={{ fontSize: '14px', color: '#666' }}>
          <li>/auth/google/callback</li>
        </ul>
        <p style={{ fontSize: '12px', color: '#888' }}>
          This is a demo implementation. In production, configure these URLs in your OAuth provider settings.
        </p>
      </div>
    </div>
  );
}