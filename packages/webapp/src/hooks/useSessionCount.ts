import { useState, useEffect } from 'react';

interface SessionData {
  count: number;
  loading: boolean;
  error?: string;
}

/**
 * Hook to monitor active session count
 * Polls /api/sessions endpoint every 10 seconds
 */
export function useSessionCount(intervalMs = 10000) {
  const [sessionData, setSessionData] = useState<SessionData>({
    count: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/sessions');
        if (response.ok) {
          const data = await response.json();
          // Count active sessions
          const activeSessions = data.sessions?.filter(
            (s: any) => s.status === 'active'
          ).length || 0;
          
          setSessionData({
            count: activeSessions,
            loading: false,
          });
        } else {
          setSessionData({
            count: 0,
            loading: false,
            error: 'Failed to fetch sessions',
          });
        }
      } catch (error) {
        setSessionData({
          count: 0,
          loading: false,
          error: 'Network error',
        });
      }
    };

    // Fetch immediately
    fetchSessions();

    // Set up interval
    const interval = setInterval(fetchSessions, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return sessionData;
}