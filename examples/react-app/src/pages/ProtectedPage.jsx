import { useAuth } from '../auth/AuthContext';
import UserProfile from '../components/UserProfile';

export default function ProtectedPage() {
  const { user } = useAuth();

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '40px 20px' 
    }}>
      <h1>🔒 Protected Page</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        This page is only accessible to authenticated users.
      </p>

      <UserProfile />

      <div style={{ 
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h2>User Session Data</h2>
        <pre style={{ 
          background: '#f5f5f5',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      <div style={{ 
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#e8f5e8',
        borderRadius: '8px',
        border: '1px solid #4caf50'
      }}>
        <h3>✅ OAuth Tunnel Test Results</h3>
        <p><strong>Current Domain:</strong> {window.location.origin}</p>
        <p><strong>Authentication Status:</strong> ✅ Successful</p>
        <p><strong>Provider:</strong> {user?.provider}</p>
        <p><strong>Tunnel Mode:</strong> {window.location.hostname.includes('.wingmanux.com') ? '🌐 Tunnel Active' : '🏠 Local Development'}</p>
      </div>

      <div style={{ 
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        border: '1px solid #ffc107'
      }}>
        <h3>📋 OAuth Configuration Notes</h3>
        <p>This demo shows how OAuth works in both tunnel and local environments:</p>
        <ul>
          <li><strong>Local:</strong> http://localhost:5173</li>
          <li><strong>Tunnel:</strong> https://your-session.wingmanux.com</li>
        </ul>
        <p>The Wingman SDK automatically detects tunnel mode and modifies redirect URIs accordingly.</p>
      </div>
    </div>
  );
}