import { useAuth } from '../auth/AuthContext';

export default function UserProfile() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div style={{
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      margin: '20px 0',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img 
          src={user.avatar} 
          alt={user.name}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%'
          }}
        />
        <div>
          <h3 style={{ margin: '0 0 4px 0' }}>{user.name}</h3>
          <p style={{ margin: '0', color: '#666' }}>{user.email}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888' }}>
            Signed in via {user.provider}
          </p>
        </div>
      </div>
      
      <button 
        onClick={logout}
        style={{
          marginTop: '12px',
          padding: '8px 16px',
          fontSize: '14px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          background: 'white',
          cursor: 'pointer'
        }}
      >
        Sign Out
      </button>
    </div>
  );
}