/**
 * HttpResponseReconstructor - Reconstructs full HTTP responses from tunnel protocol data
 * 
 * This class handles the reconstruction of HTTP responses from tunnel protocol messages,
 * including content encoding, headers, binary data, and streaming responses
 */

import { ServerResponse } from 'http';
import { TunnelResponse, ProtocolUtils } from '@wingman/shared';
import { createLogger } from '@wingman/shared';

const logger = createLogger('HttpResponseReconstructor');

export interface ResponseChunk {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  isBase64?: boolean;
  isFirstChunk?: boolean;
}

export class HttpResponseReconstructor {
  /**
   * Write a complete tunnel response to an HTTP ServerResponse
   */
  writeResponse(res: ServerResponse, tunnelResponse: TunnelResponse): void {
    // Check if headers are already sent
    if (res.headersSent) {
      throw new Error('Cannot write response: headers already sent');
    }

    try {
      // Write status and headers
      res.writeHead(
        tunnelResponse.status,
        tunnelResponse.statusText,
        tunnelResponse.headers
      );

      // Determine response body
      let responseBody: Buffer | string | undefined;

      if (tunnelResponse.error) {
        // Use error message as body
        responseBody = tunnelResponse.error;
      } else if (tunnelResponse.body !== undefined) {
        // Decode body based on encoding
        responseBody = this.decodeResponseBody(tunnelResponse.body, tunnelResponse.isBase64 || false);
      }

      // End response with body
      if (responseBody !== undefined) {
        res.end(responseBody);
      } else {
        res.end();
      }

      logger.debug(`Response ${tunnelResponse.id} reconstructed: ${tunnelResponse.status} ${tunnelResponse.statusText || ''}`);

    } catch (error) {
      logger.error(`Failed to reconstruct response ${tunnelResponse.id}:`, error);
      throw error;
    }
  }

  /**
   * Write a response chunk for streaming responses
   */
  writeResponseChunk(res: ServerResponse, chunk: ResponseChunk): void {
    try {
      // Write headers on first chunk
      if (chunk.isFirstChunk && chunk.status !== undefined) {
        if (res.headersSent) {
          logger.warn('Headers already sent, cannot write status and headers');
        } else {
          res.writeHead(
            chunk.status,
            chunk.statusText,
            chunk.headers || {}
          );
        }
      }

      // Write body chunk if present
      if (chunk.body !== undefined) {
        const bodyData = this.decodeResponseBody(chunk.body, chunk.isBase64 || false);
        res.write(bodyData);
      }

    } catch (error) {
      logger.error('Failed to write response chunk:', error);
      throw error;
    }
  }

  /**
   * End a streaming response
   */
  endResponse(res: ServerResponse): void {
    try {
      res.end();
      logger.debug('Streaming response ended');
    } catch (error) {
      logger.error('Failed to end streaming response:', error);
      throw error;
    }
  }

  /**
   * Decode response body based on encoding
   */
  private decodeResponseBody(body: string, isBase64: boolean): Buffer | string {
    if (isBase64) {
      try {
        // Validate base64 format first
        if (!this.isValidBase64(body)) {
          throw new Error('Invalid base64 format');
        }
        return ProtocolUtils.decodeContent(body, true);
      } catch (error) {
        logger.error('Failed to decode base64 body:', error);
        throw new Error('Invalid base64 data in response body');
      }
    } else {
      return body;
    }
  }

  /**
   * Validate base64 string format
   */
  private isValidBase64(str: string): boolean {
    // Base64 should only contain A-Z, a-z, 0-9, +, /, and = for padding
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    
    if (!base64Regex.test(str)) {
      return false;
    }

    // Length should be divisible by 4
    if (str.length % 4 !== 0) {
      return false;
    }

    return true;
  }

  /**
   * Validate response before reconstruction
   */
  private validateResponse(tunnelResponse: TunnelResponse): void {
    if (!tunnelResponse.id) {
      throw new Error('Response missing required ID');
    }

    if (typeof tunnelResponse.status !== 'number' || tunnelResponse.status < 100 || tunnelResponse.status > 599) {
      throw new Error(`Invalid HTTP status code: ${tunnelResponse.status}`);
    }

    if (tunnelResponse.headers && typeof tunnelResponse.headers !== 'object') {
      throw new Error('Response headers must be an object');
    }
  }

  /**
   * Get response size for logging/debugging
   */
  getResponseSize(tunnelResponse: TunnelResponse): number {
    if (tunnelResponse.error) {
      return Buffer.byteLength(tunnelResponse.error, 'utf8');
    }

    if (tunnelResponse.body) {
      if (tunnelResponse.isBase64) {
        try {
          const decoded = ProtocolUtils.decodeContent(tunnelResponse.body, true);
          return decoded.length;
        } catch {
          return 0;
        }
      } else {
        return Buffer.byteLength(tunnelResponse.body, 'utf8');
      }
    }

    return 0;
  }

  /**
   * Check if response is binary based on content type
   */
  isBinaryResponse(contentType: string): boolean {
    return ProtocolUtils.shouldBase64Encode(contentType);
  }

  /**
   * Get response summary for logging
   */
  getResponseSummary(tunnelResponse: TunnelResponse): string {
    const size = this.getResponseSize(tunnelResponse);
    const contentType = tunnelResponse.headers['content-type'] || 'unknown';
    const hasError = !!tunnelResponse.error;
    
    return `${tunnelResponse.status} ${tunnelResponse.statusText || ''} - ${contentType} - ${size} bytes${hasError ? ' (error)' : ''}`;
  }
}