# Wingman OAuth Demo

This sample app demonstrates how to use Wingman SDK's OAuth tunnel support to make authentication work seamlessly in both local development and tunnel environments.

## What This Demo Shows

### Routes
- **`/`** - Public home page showing authentication status
- **`/protected`** - Protected page requiring authentication
- **`/login`** - Login page with OAuth providers
- **`/demo`** - Original component demo page

### OAuth Flow
1. User clicks "Sign in with Google/Microsoft" on `/login`
2. Wingman SDK detects tunnel mode via headers
3. Redirect URIs are automatically modified for tunnel domain
4. OAuth completes successfully regardless of domain

## How It Works

### 1. Wingman SDK Configuration
```javascript
const oauthConfig = {
  // Routes that need OAuth tunnel support
  routes: ['/auth/*'],
  
  // How to modify redirect URIs for tunnel domains
  modifyRedirectUri: (originalUri, tunnelDomain) => {
    return originalUri.replace(/https?:\/\/[^\/]+/, tunnelDomain);
  },
  
  // Environment variable overrides for tunnel mode
  envOverrides: {
    'OAUTH_REDIRECT_BASE': '{tunnelDomain}'
  }
};
```

### 2. Provider Integration
```javascript
<WingmanProvider config={{ oauth: oauthConfig, debug: true }}>
  <AuthProvider>
    <App />
  </AuthProvider>
</WingmanProvider>
```

### 3. Tunnel Detection
- **Server-side**: Tunnel proxy adds `X-Tunnel-OAuth: true` header for `/auth/*` routes
- **Client-side**: SDK detects tunnel context and modifies OAuth configuration
- **Automatic**: Works without manual configuration changes

## Testing OAuth in Different Environments

### Local Development
- **URL**: http://localhost:5173
- **OAuth Callbacks**: Use localhost URLs
- **Testing**: Click login buttons to see standard OAuth flow

### Tunnel Mode  
- **URL**: https://your-session.wingmanux.com
- **OAuth Callbacks**: Automatically use tunnel domain
- **Testing**: Same login buttons, different domain handling

## Implementation Details

### Authentication Flow (Demo)
This demo uses a simplified authentication system for demonstration:

1. **Login Button Click** → Simulates OAuth redirect
2. **Callback Simulation** → Mock successful OAuth response
3. **User Session** → Stored in localStorage
4. **Protected Routes** → Check authentication status

### Real OAuth Integration
For production use with real OAuth providers:

1. **Configure OAuth Provider** (Google Console, Microsoft Azure, etc.)
2. **Add Tunnel Domains** to allowed redirect URIs (or use Wingman's dynamic handling)
3. **Use Wingman SDK** with your existing OAuth library
4. **OAuth Works** in both local and tunnel environments

## Configuration Examples

### NextAuth.js
```javascript
const oauthConfig = {
  routes: ['/api/auth/*'],
  envOverrides: {
    'NEXTAUTH_URL': '{tunnelDomain}'
  }
};
```

### Auth0
```javascript
const oauthConfig = {
  routes: ['/api/auth/*'],
  envOverrides: {
    'AUTH0_BASE_URL': '{tunnelDomain}'
  }
};
```

### Custom Passport.js
```javascript
const oauthConfig = {
  routes: ['/auth/*/callback', '/auth/*'],
  modifyRedirectUri: (uri, tunnelDomain) => {
    return uri.replace('localhost:3000', tunnelDomain.replace('https://', ''));
  }
};
```

## Getting Started

1. **Start the sample app**: `npm run dev` (runs on http://localhost:5173)
2. **Create a tunnel**: Use Wingman CLI or Chrome extension to tunnel port 5173
3. **Test OAuth**: Navigate to tunnel URL and try the login flow
4. **Compare**: Test same flow on localhost vs tunnel to see the difference

## Key Benefits

- ✅ **Zero OAuth provider reconfiguration** needed
- ✅ **Works with any tunnel domain** (dynamic session IDs)  
- ✅ **Same code** works locally and in tunnels
- ✅ **Framework agnostic** - works with any OAuth implementation
- ✅ **Simple configuration** - just specify routes that need tunnel support