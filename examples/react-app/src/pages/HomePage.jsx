import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import UserProfile from '../components/UserProfile';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '40px 20px' 
    }}>
      <h1>🦅 Wingman OAuth Demo</h1>
      <p style={{ color: '#666', fontSize: '18px', marginBottom: '30px' }}>
        Demonstrating OAuth authentication that works seamlessly in both local development and tunnel environments.
      </p>

      {isAuthenticated ? (
        <div>
          <div style={{ 
            padding: '20px',
            backgroundColor: '#e8f5e8',
            borderRadius: '8px',
            border: '1px solid #4caf50',
            marginBottom: '30px'
          }}>
            <h2>✅ You're signed in!</h2>
            <p>Welcome back! You have access to protected content.</p>
            <Link 
              to="/protected"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#4caf50',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                marginTop: '10px'
              }}
            >
              View Protected Page
            </Link>
          </div>
          
          <UserProfile />
        </div>
      ) : (
        <div>
          <div style={{ 
            padding: '20px',
            backgroundColor: '#f0f8ff',
            borderRadius: '8px',
            border: '1px solid #2196f3',
            marginBottom: '30px'
          }}>
            <h2>🔐 Authentication Required</h2>
            <p>Sign in to access protected features and content.</p>
            <Link 
              to="/login"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#2196f3',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                marginTop: '10px'
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      )}

      <div style={{ 
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3>🧪 Test OAuth in Different Environments</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <div>
            <h4>🏠 Local Development</h4>
            <p style={{ fontSize: '14px', color: '#666' }}>
              <strong>URL:</strong> http://localhost:5173<br/>
              <strong>OAuth Callbacks:</strong> Standard localhost URLs
            </p>
          </div>
          <div>
            <h4>🌐 Tunnel Mode</h4>
            <p style={{ fontSize: '14px', color: '#666' }}>
              <strong>URL:</strong> https://session-id.wingmanux.com<br/>
              <strong>OAuth Callbacks:</strong> Automatically modified for tunnel domain
            </p>
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        border: '1px solid #ffc107'
      }}>
        <h3>⚙️ Wingman SDK Configuration</h3>
        <pre style={{ 
          background: '#f5f5f5',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '12px'
        }}>{`const oauthConfig = {
  routes: ['/auth/*'],
  modifyRedirectUri: (uri, tunnelDomain) => 
    uri.replace(/https?:\\/\\/[^\\/]+/, tunnelDomain),
  envOverrides: {
    'OAUTH_REDIRECT_URI': '{tunnelDomain}/auth/callback'
  }
};`}</pre>
      </div>
    </div>
  );
}