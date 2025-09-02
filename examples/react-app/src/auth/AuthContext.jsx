import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth state in localStorage
    const savedUser = localStorage.getItem('google-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('google-user');
      }
    }
    setLoading(false);
  }, []);

  const handleGoogleLoginSuccess = (credentialResponse) => {
    console.log('[Real OAuth] Google login successful:', credentialResponse);
    
    // Decode the JWT token to get user info
    try {
      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      console.log('[Real OAuth] Decoded user data:', decoded);
      
      const currentDomain = window.location.origin;
      const isTunnelMode = currentDomain.includes('.wingmanux.com');
      
      const googleUser = {
        id: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        avatar: decoded.picture,
        provider: 'google',
        credential: credentialResponse.credential,
        domain: currentDomain,
        tunnelMode: isTunnelMode,
        raw: decoded
      };
      
      setUser(googleUser);
      localStorage.setItem('google-user', JSON.stringify(googleUser));
      
      console.log(`[Real OAuth] User authenticated in ${isTunnelMode ? 'tunnel' : 'local'} mode:`, googleUser);
    } catch (error) {
      console.error('Error decoding Google credential:', error);
    }
  };

  const handleGoogleLoginError = (error) => {
    console.error('[Real OAuth] Google login failed:', error);
  };

  // Initialize Google OAuth when component mounts
  useEffect(() => {
    const initializeGoogleOAuth = () => {
      if (!window.google) return;
      
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error('[Real OAuth] Google Client ID not found in environment');
        return;
      }

      console.log('[Real OAuth] Initializing Google OAuth with client ID:', clientId);
      
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleLoginSuccess,
          auto_select: false,
        });
        console.log('[Real OAuth] Google OAuth initialized successfully');
      } catch (error) {
        console.error('[Real OAuth] Failed to initialize Google OAuth:', error);
      }
    };

    // Load Google Identity Services script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleOAuth;
      document.head.appendChild(script);
    } else {
      initializeGoogleOAuth();
    }
  }, []);

  const logout = () => {
    console.log(`[Real OAuth] Logging out user:`, user);
    setUser(null);
    localStorage.removeItem('google-user');
  };

  const value = {
    user,
    loading,
    logout,
    isAuthenticated: !!user,
    handleGoogleLoginSuccess,
    handleGoogleLoginError
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