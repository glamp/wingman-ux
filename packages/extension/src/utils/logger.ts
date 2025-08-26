/**
 * Local logger utility for Chrome Extension content scripts
 * 
 * Content scripts cannot use ES modules, so this is a local copy
 * of the logger functionality from packages/shared/src/logger.ts
 * 
 * This version is specifically for content scripts and other parts
 * of the Chrome extension that cannot import from @wingman/shared.
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LoggerConfig {
  level?: LogLevel;
  namespace?: string;
  enabled?: boolean;
}

// Log level priority (higher number = more verbose)
const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Get config from the injected build-time config
function getConfig() {
  if (typeof __WINGMAN_CONFIG__ !== 'undefined') {
    return __WINGMAN_CONFIG__;
  }
  // Fallback config
  return {
    environment: 'production',
    features: { verboseLogging: false }
  };
}

// Get log level from config
function getDefaultLogLevel(): LogLevel {
  const config = getConfig();
  
  // Check verbose logging flag
  if (config.features?.verboseLogging) {
    return 'debug';
  }
  
  // Environment-based defaults
  switch (config.environment) {
    case 'development':
      return 'debug';
    case 'staging':
    case 'test':
      return 'info';
    case 'production':
    default:
      return 'error';
  }
}

class ContentLogger {
  private level: number;
  private namespace: string;
  private enabled: boolean;
  private environment: string;

  constructor(config: LoggerConfig = {}) {
    const wingmanConfig = getConfig();
    
    this.namespace = config.namespace || 'Wingman';
    this.enabled = config.enabled !== false;
    this.environment = wingmanConfig.environment || 'production';
    
    const logLevel = config.level || getDefaultLogLevel();
    this.level = LOG_LEVELS[logLevel];
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    return LOG_LEVELS[level] <= this.level;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const prefix = `[${this.namespace}]`;
    
    // In development, include level
    if (this.environment === 'development') {
      return `${prefix} [${level.toUpperCase()}] ${message}`;
    }
    
    // In production, keep it simple
    return `${prefix} ${message}`;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  // Create a child logger with a sub-namespace
  child(subNamespace: string, config?: Partial<LoggerConfig>): ContentLogger {
    return new ContentLogger({
      ...config,
      namespace: `${this.namespace}:${subNamespace}`,
      level: config?.level || (this.level === 0 ? 'error' : this.level === 1 ? 'warn' : this.level === 2 ? 'info' : 'debug'),
      enabled: config?.enabled !== undefined ? config.enabled : this.enabled,
    });
  }
}

// Export factory function for creating loggers
export function createLogger(namespace: string, config?: Partial<LoggerConfig>): ContentLogger {
  return new ContentLogger({ ...config, namespace });
}

// Default logger instance
export const logger = new ContentLogger({ namespace: 'Wingman' });