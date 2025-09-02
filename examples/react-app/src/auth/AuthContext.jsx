import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth state in localStorage
    const savedUser = localStorage.getItem('demo-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (provider) => {
    console.log(`[Demo OAuth] Attempting login with ${provider}`);
    
    // Simulate OAuth redirect
    // In a real app, this would redirect to the OAuth provider
    const currentDomain = window.location.origin;
    const callbackUrl = `${currentDomain}/auth/callback`;
    
    console.log(`[Demo OAuth] Would redirect to ${provider} with callback: ${callbackUrl}`);
    
    // For demo purposes, simulate successful login
    setTimeout(() => {
      const mockUser = {
        id: '12345',
        name: 'Demo User',
        email: 'demo@example.com',
        provider: provider,
        avatar: `https://ui-avatars.com/api/?name=Demo+User&background=667eea&color=fff`
      };
      
      setUser(mockUser);
      localStorage.setItem('demo-user', JSON.stringify(mockUser));
      console.log(`[Demo OAuth] Login successful:`, mockUser);
    }, 1000);
  };

  const logout = () => {
    console.log(`[Demo OAuth] Logging out user:`, user);
    setUser(null);
    localStorage.removeItem('demo-user');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}