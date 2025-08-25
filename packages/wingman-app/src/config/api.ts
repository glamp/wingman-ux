/**
 * API configuration for the Wingman app
 * Allows configuring the backend API URL based on environment
 */

// Get API URL from environment or use default
// In production, this will be set during build time
const getApiUrl = (): string => {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || 'http://localhost:8787';
  }
  
  // Production API URL
  return import.meta.env.VITE_API_URL || 'https://wingman-tunnel.fly.dev';
};

export const API_BASE_URL = getApiUrl();

/**
 * Helper function to construct API endpoints
 */
export function apiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
}

/**
 * Fetch wrapper with default options for API calls
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  
  // Add default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };
  
  return fetch(url, {
    ...options,
    headers,
    // Enable CORS
    mode: 'cors',
    credentials: 'include',
  });
}

/**
 * WebSocket URL helper
 */
export function wsUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
  const baseUrl = API_BASE_URL.replace(/^https?/, wsProtocol);
  return `${baseUrl}/${cleanPath}`;
}