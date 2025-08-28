/**
 * Tunnel Protocol Specification
 * 
 * Defines the WebSocket-based HTTP tunneling protocol between server and Chrome extension
 * Based on research of ngrok, localtunnel, and other proven tunneling solutions
 */

// Base message interface
export interface BaseMessage {
  type: string;
  timestamp?: number;
}

// Request from server to extension
export interface TunnelRequest extends BaseMessage {
  type: 'request';
  id: string;                    // Unique request ID (req_timestamp_random)
  sessionId: string;            // Tunnel session identifier
  method: string;               // HTTP method (GET, POST, etc)
  url: string;                  // Full URL path + query string
  headers: Record<string, string>; // HTTP headers
  body?: string;                // Request body (base64 if binary)
  isBase64?: boolean;           // Whether body is base64 encoded
}

// Response from extension to server
export interface TunnelResponse extends BaseMessage {
  type: 'response';
  id: string;                   // Matching request ID
  sessionId: string;            // Tunnel session identifier  
  status: number;               // HTTP status code
  statusText?: string;          // HTTP status text
  headers: Record<string, string>; // HTTP response headers
  body?: string;                // Response body (base64 if binary)
  isBase64?: boolean;           // Whether body is base64 encoded
  error?: string;               // Error message if request failed
}

// Connection management messages
export interface ConnectionMessage extends BaseMessage {
  sessionId: string;
}

// Register tunnel session
export interface RegisterMessage extends ConnectionMessage {
  type: 'register';
  role: 'developer' | 'pm';
  targetPort?: number;          // Port to tunnel to (for developer)
}

// Registration confirmation
export interface RegisteredMessage extends ConnectionMessage {
  type: 'registered';
  role: 'developer' | 'pm';
  tunnelUrl?: string;           // Public tunnel URL
}

// Heartbeat/keepalive
export interface HeartbeatMessage extends ConnectionMessage {
  type: 'heartbeat' | 'pong';
}

// Disconnect notification
export interface DisconnectMessage extends ConnectionMessage {
  type: 'disconnect';
  reason?: string;
}

// Error notification
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  sessionId?: string;
  code?: string;
  message: string;
  details?: any;
}

// Union type of all possible messages
export type TunnelMessage = 
  | TunnelRequest
  | TunnelResponse
  | RegisterMessage
  | RegisteredMessage
  | HeartbeatMessage
  | DisconnectMessage
  | ErrorMessage;

// Protocol configuration
export interface ProtocolConfig {
  requestTimeoutMs: number;     // Request timeout (default: 30000)
  heartbeatIntervalMs: number;  // Heartbeat interval (default: 30000)
  maxConcurrentRequests: number; // Max simultaneous requests (default: 50)
  maxRequestBodySize: number;   // Max request body size (default: 10MB)
  compressionEnabled: boolean;  // Enable WebSocket compression
}

export const DEFAULT_PROTOCOL_CONFIG: ProtocolConfig = {
  requestTimeoutMs: 30000,      // 30 seconds
  heartbeatIntervalMs: 30000,   // 30 seconds
  maxConcurrentRequests: 50,    // 50 simultaneous requests
  maxRequestBodySize: 10 * 1024 * 1024, // 10MB
  compressionEnabled: true
};

// Protocol error codes
export enum ProtocolErrorCode {
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  UNKNOWN_SESSION = 'UNKNOWN_SESSION',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  REQUEST_TOO_LARGE = 'REQUEST_TOO_LARGE',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TUNNEL_NOT_FOUND = 'TUNNEL_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

// Utility functions for protocol handling
export class ProtocolUtils {
  /**
   * Generate unique request ID
   */
  static generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `req_${timestamp}_${random}`;
  }

  /**
   * Validate message structure
   */
  static validateMessage(message: any): message is TunnelMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    if (!message.type || typeof message.type !== 'string') {
      return false;
    }

    // Validate specific message types
    switch (message.type) {
      case 'request':
        return !!(message.id && message.sessionId && message.method && message.url);
      case 'response':
        return !!(message.id && message.sessionId && typeof message.status === 'number');
      case 'register':
        return !!(message.sessionId && message.role);
      case 'registered':
        return !!(message.sessionId && message.role);
      case 'heartbeat':
      case 'pong':
        return !!message.sessionId;
      case 'disconnect':
        return !!message.sessionId;
      case 'error':
        return !!message.message;
      default:
        return false;
    }
  }

  /**
   * Create error message
   */
  static createError(
    code: ProtocolErrorCode,
    message: string,
    sessionId?: string,
    details?: any
  ): ErrorMessage {
    const error: ErrorMessage = {
      type: 'error',
      code,
      message,
      timestamp: Date.now()
    };
    
    if (sessionId !== undefined) {
      error.sessionId = sessionId;
    }
    
    if (details !== undefined) {
      error.details = details;
    }
    
    return error;
  }

  /**
   * Check if content should be base64 encoded
   */
  static shouldBase64Encode(contentType: string): boolean {
    const textTypes = [
      'text/',
      'application/json',
      'application/xml',
      'application/x-www-form-urlencoded'
    ];

    // If it's a known text type, don't base64 encode
    const isTextType = textTypes.some(type => contentType.toLowerCase().includes(type));
    return !isTextType;
  }

  /**
   * Encode content for transmission
   */
  static encodeContent(content: string | Buffer, contentType: string = ''): {
    body: string;
    isBase64: boolean;
  } {
    const shouldEncode = this.shouldBase64Encode(contentType);
    
    if (shouldEncode) {
      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
      return {
        body: buffer.toString('base64'),
        isBase64: true
      };
    } else {
      return {
        body: content.toString(),
        isBase64: false
      };
    }
  }

  /**
   * Decode content from transmission
   */
  static decodeContent(body: string, isBase64: boolean): Buffer {
    if (isBase64) {
      return Buffer.from(body, 'base64');
    } else {
      return Buffer.from(body, 'utf8');
    }
  }

  /**
   * Sanitize HTTP headers for transmission
   */
  static sanitizeHeaders(headers: Record<string, string | string[]>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    Object.entries(headers).forEach(([key, value]) => {
      // Skip problematic headers
      const lowerKey = key.toLowerCase();
      if (['host', 'connection', 'upgrade', 'sec-websocket-key'].includes(lowerKey)) {
        return;
      }

      // Convert array values to comma-separated strings
      if (Array.isArray(value)) {
        sanitized[key] = value.join(', ');
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }
}

// Type guards for message types
export const isRequest = (message: TunnelMessage): message is TunnelRequest => 
  message.type === 'request';

export const isResponse = (message: TunnelMessage): message is TunnelResponse => 
  message.type === 'response';

export const isRegister = (message: TunnelMessage): message is RegisterMessage => 
  message.type === 'register';

export const isRegistered = (message: TunnelMessage): message is RegisteredMessage => 
  message.type === 'registered';

export const isError = (message: TunnelMessage): message is ErrorMessage => 
  message.type === 'error';