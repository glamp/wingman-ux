/**
 * Tests for HttpResponseReconstructor - TDD approach
 * 
 * This class reconstructs full HTTP responses from tunnel protocol data
 * handling content encoding, headers, and streaming responses
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HttpResponseReconstructor } from '../http-response-reconstructor';
import { TunnelResponse, ProtocolUtils } from '@wingman/shared';
import { ServerResponse } from 'http';

// Mock ServerResponse
const createMockResponse = () => ({
  writeHead: vi.fn(),
  setHeader: vi.fn(),
  write: vi.fn(),
  end: vi.fn(),
  headersSent: false,
  statusCode: 200,
  statusMessage: 'OK'
});

describe('HttpResponseReconstructor', () => {
  let reconstructor: HttpResponseReconstructor;

  beforeEach(() => {
    reconstructor = new HttpResponseReconstructor();
  });

  describe('text response reconstruction', () => {
    it('should reconstruct simple text response', () => {
      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_123',
        sessionId: 'test-session',
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'text/plain',
          'content-length': '12'
        },
        body: 'Hello World!',
        isBase64: false,
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      reconstructor.writeResponse(mockRes as any, tunnelResponse);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, 'OK', {
        'content-type': 'text/plain',
        'content-length': '12'
      });
      expect(mockRes.end).toHaveBeenCalledWith('Hello World!');
    });

    it('should handle responses without status text', () => {
      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_124',
        sessionId: 'test-session',
        status: 201,
        headers: {
          'content-type': 'application/json'
        },
        body: '{"created": true}',
        isBase64: false,
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      reconstructor.writeResponse(mockRes as any, tunnelResponse);

      expect(mockRes.writeHead).toHaveBeenCalledWith(201, undefined, {
        'content-type': 'application/json'
      });
      expect(mockRes.end).toHaveBeenCalledWith('{"created": true}');
    });

    it('should handle responses without body', () => {
      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_125',
        sessionId: 'test-session',
        status: 204,
        statusText: 'No Content',
        headers: {
          'cache-control': 'no-cache'
        },
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      reconstructor.writeResponse(mockRes as any, tunnelResponse);

      expect(mockRes.writeHead).toHaveBeenCalledWith(204, 'No Content', {
        'cache-control': 'no-cache'
      });
      expect(mockRes.end).toHaveBeenCalledWith();
    });
  });

  describe('binary response reconstruction', () => {
    it('should reconstruct base64-encoded binary response', () => {
      // Create a simple binary content (PNG header)
      const binaryData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      ]);
      const base64Data = binaryData.toString('base64');

      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_126',
        sessionId: 'test-session',
        status: 200,
        headers: {
          'content-type': 'image/png',
          'content-length': binaryData.length.toString()
        },
        body: base64Data,
        isBase64: true,
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      reconstructor.writeResponse(mockRes as any, tunnelResponse);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, undefined, {
        'content-type': 'image/png',
        'content-length': binaryData.length.toString()
      });
      expect(mockRes.end).toHaveBeenCalledWith(binaryData);
    });

    it('should handle invalid base64 data gracefully', () => {
      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_127',
        sessionId: 'test-session',
        status: 200,
        headers: {
          'content-type': 'image/jpeg'
        },
        body: 'invalid-base64!!!',
        isBase64: true,
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      
      expect(() => {
        reconstructor.writeResponse(mockRes as any, tunnelResponse);
      }).toThrow('Invalid base64 data in response body');
    });
  });

  describe('header handling', () => {
    it('should preserve all HTTP headers', () => {
      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_128',
        sessionId: 'test-session',
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'set-cookie': 'sessionId=abc123; Path=/',
          'cache-control': 'max-age=3600',
          'x-custom-header': 'custom-value'
        },
        body: '<html><body>Test</body></html>',
        isBase64: false,
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      reconstructor.writeResponse(mockRes as any, tunnelResponse);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, undefined, {
        'content-type': 'text/html; charset=utf-8',
        'set-cookie': 'sessionId=abc123; Path=/',
        'cache-control': 'max-age=3600',
        'x-custom-header': 'custom-value'
      });
    });

    it('should handle empty headers object', () => {
      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_129',
        sessionId: 'test-session',
        status: 200,
        headers: {},
        body: 'Simple response',
        isBase64: false,
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      reconstructor.writeResponse(mockRes as any, tunnelResponse);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, undefined, {});
      expect(mockRes.end).toHaveBeenCalledWith('Simple response');
    });
  });

  describe('error response handling', () => {
    it('should handle error responses', () => {
      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_130',
        sessionId: 'test-session',
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          'content-type': 'text/plain'
        },
        error: 'Database connection failed',
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      reconstructor.writeResponse(mockRes as any, tunnelResponse);

      expect(mockRes.writeHead).toHaveBeenCalledWith(500, 'Internal Server Error', {
        'content-type': 'text/plain'
      });
      expect(mockRes.end).toHaveBeenCalledWith('Database connection failed');
    });

    it('should handle error responses without explicit body', () => {
      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_131',
        sessionId: 'test-session',
        status: 404,
        statusText: 'Not Found',
        headers: {
          'content-type': 'text/plain'
        },
        error: 'Resource not found',
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      reconstructor.writeResponse(mockRes as any, tunnelResponse);

      expect(mockRes.writeHead).toHaveBeenCalledWith(404, 'Not Found', {
        'content-type': 'text/plain'
      });
      expect(mockRes.end).toHaveBeenCalledWith('Resource not found');
    });
  });

  describe('streaming response handling', () => {
    it('should handle responses with streaming data', () => {
      const mockRes = createMockResponse();
      
      // Simulate streaming by writing chunks
      const chunks = ['chunk1', 'chunk2', 'chunk3'];
      
      reconstructor.writeResponseChunk(mockRes as any, {
        status: 200,
        headers: { 'content-type': 'text/plain' },
        isFirstChunk: true
      });

      chunks.forEach(chunk => {
        reconstructor.writeResponseChunk(mockRes as any, { body: chunk });
      });

      reconstructor.endResponse(mockRes as any);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, undefined, {
        'content-type': 'text/plain'
      });
      expect(mockRes.write).toHaveBeenCalledTimes(3);
      expect(mockRes.write).toHaveBeenNthCalledWith(1, 'chunk1');
      expect(mockRes.write).toHaveBeenNthCalledWith(2, 'chunk2');
      expect(mockRes.write).toHaveBeenNthCalledWith(3, 'chunk3');
      expect(mockRes.end).toHaveBeenCalledWith();
    });

    it('should not write headers twice for streaming responses', () => {
      const mockRes = createMockResponse();
      
      // First chunk with headers
      reconstructor.writeResponseChunk(mockRes as any, {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: '{"data": "first"}',
        isFirstChunk: true
      });

      // Second chunk without headers (should not call writeHead again)
      reconstructor.writeResponseChunk(mockRes as any, {
        body: '{"data": "second"}'
      });

      expect(mockRes.writeHead).toHaveBeenCalledTimes(1);
      expect(mockRes.write).toHaveBeenCalledTimes(2);
    });
  });

  describe('content encoding handling', () => {
    it('should handle gzip-encoded content', () => {
      // Simulate gzipped content
      const gzipData = Buffer.from('gzipped content placeholder');
      const base64GzipData = gzipData.toString('base64');

      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_132',
        sessionId: 'test-session',
        status: 200,
        headers: {
          'content-type': 'text/html',
          'content-encoding': 'gzip',
          'content-length': gzipData.length.toString()
        },
        body: base64GzipData,
        isBase64: true,
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      reconstructor.writeResponse(mockRes as any, tunnelResponse);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, undefined, {
        'content-type': 'text/html',
        'content-encoding': 'gzip',
        'content-length': gzipData.length.toString()
      });
      expect(mockRes.end).toHaveBeenCalledWith(gzipData);
    });
  });

  describe('edge cases', () => {
    it('should handle very large response bodies', () => {
      const largeBody = 'x'.repeat(1000000); // 1MB of 'x'
      
      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_133',
        sessionId: 'test-session',
        status: 200,
        headers: {
          'content-type': 'text/plain',
          'content-length': largeBody.length.toString()
        },
        body: largeBody,
        isBase64: false,
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      
      expect(() => {
        reconstructor.writeResponse(mockRes as any, tunnelResponse);
      }).not.toThrow();

      expect(mockRes.end).toHaveBeenCalledWith(largeBody);
    });

    it('should handle empty string body', () => {
      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_134',
        sessionId: 'test-session',
        status: 200,
        headers: {
          'content-type': 'text/plain',
          'content-length': '0'
        },
        body: '',
        isBase64: false,
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      reconstructor.writeResponse(mockRes as any, tunnelResponse);

      expect(mockRes.end).toHaveBeenCalledWith('');
    });

    it('should prevent writing to response after headers are sent', () => {
      const tunnelResponse: TunnelResponse = {
        type: 'response',
        id: 'req_135',
        sessionId: 'test-session',
        status: 200,
        headers: { 'content-type': 'text/plain' },
        body: 'Test body',
        isBase64: false,
        timestamp: Date.now()
      };

      const mockRes = createMockResponse();
      mockRes.headersSent = true; // Simulate headers already sent

      expect(() => {
        reconstructor.writeResponse(mockRes as any, tunnelResponse);
      }).toThrow('Cannot write response: headers already sent');
    });
  });
});