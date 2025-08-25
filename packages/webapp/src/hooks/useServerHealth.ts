import { useState, useEffect } from 'react';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'loading';
  timestamp?: string;
  uptime?: number;
}

/**
 * Hook to monitor server health status
 * Polls /health endpoint every 10 seconds
 */
export function useServerHealth(intervalMs = 10000) {
  const [health, setHealth] = useState<HealthStatus>({ status: 'loading' });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/health');
        if (response.ok) {
          const data = await response.json();
          setHealth({
            status: 'healthy',
            timestamp: data.timestamp,
            uptime: data.uptime,
          });
        } else {
          setHealth({ status: 'unhealthy' });
        }
      } catch (error) {
        setHealth({ status: 'unhealthy' });
      }
    };

    // Check immediately
    checkHealth();

    // Set up interval
    const interval = setInterval(checkHealth, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return health;
}

/**
 * Format uptime seconds into human-readable string
 */
export function formatUptime(seconds?: number): string {
  if (!seconds) return 'Unknown';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : 'Just started';
}