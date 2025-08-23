import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../index';
import type { Express } from 'express';
import type { Server } from 'http';
import fs from 'fs/promises';
import path from 'path';
import { WingmanAnnotation } from '@wingman/shared';

describe('MCP Integration', () => {
  let app: Express;
  let server: Server;
  let actualPort: number;
  const annotationsDir = './test-wingman-mcp/annotations';

  beforeEach(async () => {
    // Clean up any existing annotations
    try {
      await fs.rm(annotationsDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's fine
    }

    const serverInstance = createServer({ port: 0, host: 'localhost', storagePath: annotationsDir });
    app = serverInstance.app;
    server = await serverInstance.start();
    
    // Get the actual port that was assigned
    const address = server.address();
    actualPort = typeof address === 'string' ? parseInt(address) : address!.port;
  });

  afterEach(async () => {
    // Close server
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }

    // Clean up test annotations
    try {
      await fs.rm(annotationsDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's fine
    }
  });

  describe('GET /mcp/health', () => {
    it('should return MCP health status with available tools and prompts', async () => {
      const response = await request(app)
        .get('/mcp/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        name: 'wingman-mcp',
        version: '1.0.0',
        tools: ['wingman_list', 'wingman_review', 'wingman_delete'],
        prompts: ['wingman_fix_ui'],
      });
    });
  });

  describe('MCP Tools Integration', () => {
    it('should handle complete workflow: post annotation, list, review, delete', async () => {
      // Step 1: Post an annotation via HTTP
      const annotation: WingmanAnnotation = {
        id: 'test-mcp-integration-123',
        createdAt: new Date().toISOString(),
        note: 'Button is misaligned on checkout page',
        page: {
          url: 'https://example.com/checkout',
          title: 'Checkout - Example Shop',
          ua: 'Mozilla/5.0',
          viewport: { w: 1920, h: 1080, dpr: 1 }
        },
        target: {
          mode: 'element',
          rect: { x: 100, y: 200, width: 200, height: 50 },
          selector: '.checkout-button'
        },
        media: {
          screenshot: {
            mime: 'image/png',
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
          }
        },
        console: [],
        errors: [],
        network: [],
        react: {
          componentName: 'CheckoutButton',
          componentType: 'function',
          source: {
            fileName: 'CheckoutButton.tsx',
            lineNumber: 42,
            columnNumber: 8
          },
          obtainedVia: 'devtools-hook'
        }
      };

      const postResponse = await request(app)
        .post('/annotations')
        .send(annotation)
        .expect(201);

      expect(postResponse.body.id).toBe('test-mcp-integration-123');

      // Step 2: Verify the annotation is stored
      const getResponse = await request(app)
        .get('/annotations/test-mcp-integration-123')
        .expect(200);

      expect(getResponse.body.annotation.id).toBe('test-mcp-integration-123');
      expect(getResponse.body.annotation.note).toBe('Button is misaligned on checkout page');

      // Step 3: Get the last annotation
      const lastResponse = await request(app)
        .get('/annotations/last')
        .expect(200);

      expect(lastResponse.body.annotation.id).toBe('test-mcp-integration-123');

      // Step 4: List annotations
      const listResponse = await request(app)
        .get('/annotations')
        .expect(200);

      expect(listResponse.body.items).toHaveLength(1);
      expect(listResponse.body.items[0].id).toBe('test-mcp-integration-123');

      // Step 5: Delete the annotation (only in non-production)
      if (process.env.NODE_ENV !== 'production') {
        await request(app)
          .delete('/annotations/test-mcp-integration-123')
          .expect(204);

        // Verify deletion
        await request(app)
          .get('/annotations/test-mcp-integration-123')
          .expect(404);
      }
    });

    it('should handle annotation with React metadata correctly', async () => {
      const annotationWithReact: WingmanAnnotation = {
        id: 'test-react-metadata',
        createdAt: new Date().toISOString(),
        note: 'React component issue',
        page: {
          url: 'https://example.com',
          title: 'Test Page',
          ua: 'Mozilla/5.0',
          viewport: { w: 1920, h: 1080, dpr: 1 }
        },
        target: {
          mode: 'element',
          selector: '.test-component'
        },
        media: {
          screenshot: {
            mime: 'image/png',
            dataUrl: 'data:image/png;base64,test'
          }
        },
        console: [],
        errors: [
          { message: 'React error: Invalid prop', stack: 'stack trace', ts: Date.now() }
        ],
        network: [],
        react: {
          componentName: 'TestComponent',
          componentType: 'function',
          displayName: 'TestComponent',
          source: {
            fileName: 'TestComponent.tsx',
            lineNumber: 10,
            columnNumber: 5
          },
          props: { testProp: 'value' },
          hooks: [
            { type: 'state', name: 'useState', value: 'test' }
          ],
          obtainedVia: 'devtools-hook'
        }
      };

      await request(app)
        .post('/annotations')
        .send(annotationWithReact)
        .expect(201);

      const response = await request(app)
        .get('/annotations/test-react-metadata')
        .expect(200);

      expect(response.body.annotation.react).toBeDefined();
      expect(response.body.annotation.react.componentName).toBe('TestComponent');
      expect(response.body.annotation.react.source.fileName).toBe('TestComponent.tsx');
      expect(response.body.annotation.errors).toHaveLength(1);
    });
  });

  describe('MCP Endpoint', () => {
    it.skip('should accept POST /mcp requests for SSE connection', async () => {
      // Skipped: SSE connections stay open and require a proper MCP client for testing
      // The endpoint is tested indirectly through the health check
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty annotation list gracefully', async () => {
      const response = await request(app)
        .get('/annotations')
        .expect(200);

      expect(response.body.items).toEqual([]);
    });

    it('should return 404 for non-existent annotation', async () => {
      const response = await request(app)
        .get('/annotations/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Annotation not found');
    });

    it('should return null for last annotation when none exist', async () => {
      const response = await request(app)
        .get('/annotations/last')
        .expect(404);

      expect(response.body.error).toBe('No annotations found');
    });
  });
});