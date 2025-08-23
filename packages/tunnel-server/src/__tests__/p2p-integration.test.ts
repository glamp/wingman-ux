import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import request from 'supertest';
import { createApp } from '../index.js';
import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

describe('P2P Integration', () => {
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
    
    // Set up WebSocket handling (simplified version of what's in index.ts)
    wss.on('connection', (ws) => {
      let registeredSessionId: string | null = null;
      let isDeveloper = false;

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          switch (message.type) {
            case 'register':
              if (message.role === 'developer' && message.sessionId) {
                const session = sessionManager.getSession(message.sessionId);
                if (session) {
                  connectionManager.registerDeveloper(message.sessionId, ws);
                  registeredSessionId = message.sessionId;
                  isDeveloper = true;
                  ws.send(JSON.stringify({ 
                    type: 'registered', 
                    sessionId: message.sessionId,
                    role: 'developer'
                  }));
                  
                  if (connectionManager.isP2PAvailable(message.sessionId)) {
                    setTimeout(() => {
                      connectionManager.initiateP2P(message.sessionId);
                    }, 50);
                  }
                }
              } else if (message.role === 'pm' && message.sessionId) {
                const session = sessionManager.getSession(message.sessionId);
                if (session) {
                  connectionManager.registerPM(message.sessionId, ws);
                  registeredSessionId = message.sessionId;
                  ws.send(JSON.stringify({ 
                    type: 'registered', 
                    sessionId: message.sessionId,
                    role: 'pm'
                  }));
                  
                  if (connectionManager.isP2PAvailable(message.sessionId)) {
                    setTimeout(() => {
                      connectionManager.initiateP2P(message.sessionId);
                    }, 50);
                  }
                }
              }
              break;
            case 'p2p:offer':
            case 'p2p:answer':
            case 'p2p:ice-candidate':
            case 'p2p:ready':
            case 'p2p:failed':
              if (registeredSessionId) {
                const signalingMessage = {
                  type: message.type,
                  sessionId: registeredSessionId,
                  from: isDeveloper ? 'developer' : 'pm',
                  data: message.data
                };
                connectionManager.handleP2PSignaling(signalingMessage);
              }
              break;
          }
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      ws.on('close', () => {
        if (registeredSessionId) {
          if (isDeveloper) {
            connectionManager.handleDisconnection(registeredSessionId);
          } else {
            connectionManager.unregisterPM(registeredSessionId);
          }
        }
      });

      ws.send(JSON.stringify({
        type: 'connected',
        timestamp: Date.now()
      }));
    });
    
    // Start server on dynamic port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as AddressInfo).port;
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

  describe('P2P Connection Flow', () => {
    it('should establish P2P signaling between developer and PM', async () => {
      // Create a session first
      const sessionRes = await request(app)
        .post('/api/sessions')
        .send({ developerId: 'test-dev', targetPort: 3000 });
      
      expect(sessionRes.status).toBe(201);
      const { sessionId } = sessionRes.body;
      
      // Verify session was created
      const session = sessionManager.getSession(sessionId);
      expect(session).toBeDefined();
      
      // Create WebSockets
      const devWs = new WebSocket(`ws://localhost:${port}/ws`);
      const pmWs = new WebSocket(`ws://localhost:${port}/ws`);
      
      // Track messages
      const devMessages: any[] = [];
      const pmMessages: any[] = [];
      
      devWs.on('message', (data) => {
        devMessages.push(JSON.parse(data.toString()));
      });
      
      pmWs.on('message', (data) => {
        pmMessages.push(JSON.parse(data.toString()));
      });
      
      try {
        // Wait for connections
        await Promise.all([
          new Promise((resolve, reject) => {
            devWs.once('open', resolve);
            devWs.once('error', reject);
          }),
          new Promise((resolve, reject) => {
            pmWs.once('open', resolve);
            pmWs.once('error', reject);
          })
        ]);
        
        // Register developer
        devWs.send(JSON.stringify({
          type: 'register',
          role: 'developer',
          sessionId
        }));
        
        // Register PM
        pmWs.send(JSON.stringify({
          type: 'register',
          role: 'pm',
          sessionId
        }));
        
        // Wait for registration and P2P initiation
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Check that both got registered
        const devRegistered = devMessages.some(m => m.type === 'registered' && m.role === 'developer');
        const pmRegistered = pmMessages.some(m => m.type === 'registered' && m.role === 'pm');
        
        expect(devRegistered).toBe(true);
        expect(pmRegistered).toBe(true);
        
        // Check P2P availability
        expect(connectionManager.isP2PAvailable(sessionId)).toBe(true);
        
        // Check that P2P initiation messages were sent
        const devInitMsg = devMessages.find(m => m.type === 'p2p:initiate');
        const pmInitMsg = pmMessages.find(m => m.type === 'p2p:initiate');
        
        expect(devInitMsg).toBeDefined();
        expect(devInitMsg?.role).toBe('developer');
        
        expect(pmInitMsg).toBeDefined();
        expect(pmInitMsg?.role).toBe('pm');
      } finally {
        // Clean up
        devWs.close();
        pmWs.close();
      }
    });

    it('should relay P2P signaling messages', async () => {
      // Create session
      const sessionRes = await request(app)
        .post('/api/sessions')
        .send({ developerId: 'test-dev', targetPort: 3000 });
      
      const { sessionId } = sessionRes.body;
      
      // Create WebSockets
      const devWs = new WebSocket(`ws://localhost:${port}/ws`);
      const pmWs = new WebSocket(`ws://localhost:${port}/ws`);
      
      // Track PM messages
      const pmMessages: any[] = [];
      pmWs.on('message', (data) => {
        pmMessages.push(JSON.parse(data.toString()));
      });
      
      try {
        // Wait for connections
        await Promise.all([
          new Promise(resolve => devWs.once('open', resolve)),
          new Promise(resolve => pmWs.once('open', resolve))
        ]);
        
        // Track developer messages too
        const devMessages: any[] = [];
        devWs.on('message', (data) => {
          devMessages.push(JSON.parse(data.toString()));
        });
        
        // Register both
        devWs.send(JSON.stringify({
          type: 'register',
          role: 'developer',
          sessionId
        }));
        
        pmWs.send(JSON.stringify({
          type: 'register',
          role: 'pm',
          sessionId
        }));
        
        // Wait for registration confirmation
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Send P2P offer from developer (sessionId is already registered)
        devWs.send(JSON.stringify({
          type: 'p2p:offer',
          data: { sdp: 'test-offer-sdp', type: 'offer' }
        }));
        
        // Wait for message relay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // PM should receive the offer
        const offerMsg = pmMessages.find(m => m.type === 'p2p:offer');
        expect(offerMsg).toBeDefined();
        expect(offerMsg?.data?.sdp).toBe('test-offer-sdp');
        expect(offerMsg?.from).toBe('developer');
      } finally {
        devWs.close();
        pmWs.close();
      }
    });
  });
});