import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import request from 'supertest';
import { createApp } from '../index.js';
import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

describe('P2P Integration Debug', () => {
  let app: any;
  let server: Server;
  let wss: WebSocketServer;
  let port: number;
  let sessionManager: any;
  let connectionManager: any;

  beforeEach(async () => {
    // Create app and get managers
    const result = createApp();
    app = result.app;
    sessionManager = result.sessionManager;
    connectionManager = result.connectionManager;
    
    // Create HTTP server
    server = createServer(app);
    
    // Create WebSocket server
    wss = new WebSocketServer({ server, path: '/ws' });
    
    // Set up WebSocket handling
    wss.on('connection', (ws) => {
      console.log('WS Server: New connection');
      let registeredSessionId: string | null = null;
      let isDeveloper = false;

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('WS Server received:', message);
          
          switch (message.type) {
            case 'register':
              if (message.role === 'developer' && message.sessionId) {
                const session = sessionManager.getSession(message.sessionId);
                console.log('WS Server: Developer registering, session exists:', !!session);
                if (session) {
                  connectionManager.registerDeveloper(message.sessionId, ws);
                  registeredSessionId = message.sessionId;
                  isDeveloper = true;
                  const response = { 
                    type: 'registered', 
                    sessionId: message.sessionId,
                    role: 'developer'
                  };
                  console.log('WS Server sending:', response);
                  ws.send(JSON.stringify(response));
                  
                  if (connectionManager.isP2PAvailable(message.sessionId)) {
                    console.log('WS Server: P2P available, initiating');
                    setTimeout(() => {
                      connectionManager.initiateP2P(message.sessionId);
                    }, 50);
                  }
                }
              } else if (message.role === 'pm' && message.sessionId) {
                const session = sessionManager.getSession(message.sessionId);
                console.log('WS Server: PM registering, session exists:', !!session);
                if (session) {
                  connectionManager.registerPM(message.sessionId, ws);
                  registeredSessionId = message.sessionId;
                  const response = { 
                    type: 'registered', 
                    sessionId: message.sessionId,
                    role: 'pm'
                  };
                  console.log('WS Server sending:', response);
                  ws.send(JSON.stringify(response));
                  
                  if (connectionManager.isP2PAvailable(message.sessionId)) {
                    console.log('WS Server: P2P available, initiating');
                    setTimeout(() => {
                      connectionManager.initiateP2P(message.sessionId);
                    }, 50);
                  }
                }
              }
              break;
          }
        } catch (error) {
          console.error('WS Server error handling message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WS Server: Connection closed');
      });

      const connectedMsg = {
        type: 'connected',
        timestamp: Date.now()
      };
      console.log('WS Server sending initial:', connectedMsg);
      ws.send(JSON.stringify(connectedMsg));
    });
    
    // Start server on dynamic port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as AddressInfo).port;
        console.log('Test server listening on port:', port);
        resolve();
      });
    });
  });

  afterEach(async () => {
    // Close WebSocket server first
    wss.close();
    
    // Close HTTP server
    await new Promise<void>(resolve => {
      server.close(() => resolve());
    });
  });

  it('should debug basic connection', async () => {
    // Create a session first
    const sessionRes = await request(app)
      .post('/api/sessions')
      .send({ developerId: 'test-dev', targetPort: 3000 });
    
    expect(sessionRes.status).toBe(201);
    const { sessionId } = sessionRes.body;
    console.log('Created session:', sessionId);
    
    // Verify session was created
    const session = sessionManager.getSession(sessionId);
    expect(session).toBeDefined();
    console.log('Session exists in manager:', !!session);
    
    // Create WebSocket
    const devWs = new WebSocket(`ws://localhost:${port}/ws`);
    
    // Track messages
    const devMessages: any[] = [];
    
    devWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      console.log('Client received:', msg);
      devMessages.push(msg);
    });
    
    devWs.on('error', (err) => {
      console.error('Client error:', err);
    });
    
    try {
      // Wait for connection
      await new Promise((resolve, reject) => {
        devWs.once('open', () => {
          console.log('Client connected');
          resolve(undefined);
        });
        devWs.once('error', reject);
      });
      
      // Wait for initial connected message
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log('Messages received so far:', devMessages);
      
      // Should have received connected message
      const connectedMsg = devMessages.find(m => m.type === 'connected');
      expect(connectedMsg).toBeDefined();
      
      // Register developer
      const registerMsg = {
        type: 'register',
        role: 'developer',
        sessionId
      };
      console.log('Client sending:', registerMsg);
      devWs.send(JSON.stringify(registerMsg));
      
      // Wait for registration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('All messages received:', devMessages);
      
      // Check that we got registered
      const registeredMsg = devMessages.find(m => m.type === 'registered');
      expect(registeredMsg).toBeDefined();
      expect(registeredMsg?.role).toBe('developer');
    } finally {
      // Clean up
      devWs.close();
    }
  });
});