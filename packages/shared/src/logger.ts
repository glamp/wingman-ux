/**
 * Centralized logger utility for Wingman
 * 
 * Provides environment-aware logging with namespace support and log levels.
 * In production, only errors are logged by default to keep the console clean.
 * In development, all log levels are enabled for debugging.
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LoggerConfig {
  level?: LogLevel;
  namespace?: string;
  enabled?: boolean;
  // Allow overriding environment detection for testing
  forceEnvironment?: 'development' | 'production' | 'staging' | 'test';
}

// Log level priority (higher number = more verbose)
const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Detect environment from various sources
function detectEnvironment(): string {
  // Browser environment
  if (typeof window !== 'undefined') {
    // Check for injected config (Chrome Extension)
    if (typeof (window as any).__WINGMAN_CONFIG__ !== 'undefined') {
      return (window as any).__WINGMAN_CONFIG__.environment || 'production';
    }
  }
  
  // Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    return process.env.WINGMAN_ENV || process.env.NODE_ENV || 'production';
  }
  
  return 'production';
}

// Get log level from environment
function getDefaultLogLevel(): LogLevel {
  const env = detectEnvironment();
  
  // Check for explicit log level override
  if (typeof process !== 'undefined' && process.env?.LOG_LEVEL) {
    return process.env.LOG_LEVEL as LogLevel;
  }
  
  // Environment-based defaults
  switch (env) {
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

export class WingmanLogger {
  private level: number;
  private namespace: string;
  private enabled: boolean;
  private environment: string;

  constructor(config: LoggerConfig = {}) {
    this.namespace = config.namespace || 'Wingman';
    this.enabled = config.enabled !== false;
    this.environment = config.forceEnvironment || detectEnvironment();
    
    const logLevel = config.level || getDefaultLogLevel();
    this.level = LOG_LEVELS[logLevel];
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    return LOG_LEVELS[level] <= this.level;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${this.namespace}]`;
    
    // In development, include timestamp and level
    if (this.environment === 'development') {
      return `${timestamp} ${prefix} [${level.toUpperCase()}] ${message}`;
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
  child(subNamespace: string, config?: Partial<LoggerConfig>): WingmanLogger {
    return new WingmanLogger({
      ...config,
      namespace: `${this.namespace}:${subNamespace}`,
      level: config?.level || (this.level === 0 ? 'error' : this.level === 1 ? 'warn' : this.level === 2 ? 'info' : 'debug'),
      enabled: config?.enabled !== undefined ? config.enabled : this.enabled,
      forceEnvironment: this.environment as any,
    });
  }

  // Update log level at runtime
  setLevel(level: LogLevel): void {
    this.level = LOG_LEVELS[level];
  }

  // Enable/disable logging at runtime
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // Get current configuration
  getConfig(): { level: LogLevel; namespace: string; enabled: boolean; environment: string } {
    const levelName = Object.entries(LOG_LEVELS).find(([_, value]) => value === this.level)?.[0] as LogLevel;
    return {
      level: levelName,
      namespace: this.namespace,
      enabled: this.enabled,
      environment: this.environment,
    };
  }
}

// Default logger instances for common use cases
export const logger = new WingmanLogger();

// Convenience functions for quick logging
export const logError = (message: string, ...args: any[]) => logger.error(message, ...args);
export const logWarn = (message: string, ...args: any[]) => logger.warn(message, ...args);
export const logInfo = (message: string, ...args: any[]) => logger.info(message, ...args);
export const logDebug = (message: string, ...args: any[]) => logger.debug(message, ...args);

// Export a function to create namespace-specific loggers
export function createLogger(namespace: string, config?: Partial<LoggerConfig>): WingmanLogger {
  return new WingmanLogger({ ...config, namespace });
}