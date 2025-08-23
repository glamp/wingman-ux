import { describe, it, expect } from 'vitest';
import { WebSocket } from 'ws';
import request from 'supertest';
import { createApp } from '../index.js';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import type { P2PSignalingMessage } from '../connection-manager.js';

describe('P2P Simple Test', () => {
  it('should test P2P signaling relay', async () => {
    // Create app and get managers
    const { app, sessionManager, connectionManager } = createApp();
    
    // Create HTTP server
    const server = createServer(app);
    
    // Create WebSocket server
    const wss = new WebSocketServer({ server, path: '/ws' });
    
    // Set up WebSocket handling (matching real implementation)
    wss.on('connection', (ws) => {
      let registeredSessionId: string | null = null;
      let isDeveloper = false;

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('Server received from', isDeveloper ? 'developer' : 'pm', ':', message.type);
          
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
                  console.log('Developer registered');
                }
              } else if (message.role === 'pm' && message.sessionId) {
                const session = sessionManager.getSession(message.sessionId);
                if (session) {
                  connectionManager.registerPM(message.sessionId, ws);
                  registeredSessionId = message.sessionId;
                  isDeveloper = false; // Explicitly set to false for PM
                  ws.send(JSON.stringify({ 
                    type: 'registered', 
                    sessionId: message.sessionId,
                    role: 'pm'
                  }));
                  console.log('PM registered');
                }
              }
              break;
            case 'p2p:offer':
            case 'p2p:answer':
            case 'p2p:ice-candidate':
              // Handle P2P signaling - must have registeredSessionId
              if (registeredSessionId) {
                const signalingMessage: P2PSignalingMessage = {
                  type: message.type,
                  sessionId: registeredSessionId,
                  from: (isDeveloper ? 'developer' : 'pm') as 'developer' | 'pm',
                  data: message.data
                };
                console.log('Handling P2P signaling:', signalingMessage);
                connectionManager.handleP2PSignaling(signalingMessage);
              } else {
                console.log('No registered session for P2P message');
              }
              break;
          }
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      ws.send(JSON.stringify({
        type: 'connected',
        timestamp: Date.now()
      }));
    });
    
    // Start server
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        resolve();
      });
    });
    
    const port = (server.address() as AddressInfo).port;
    
    try {
      // Create a session
      const sessionRes = await request(app)
        .post('/api/sessions')
        .send({ developerId: 'test-dev', targetPort: 3000 });
      
      expect(sessionRes.status).toBe(201);
      const { sessionId } = sessionRes.body;
      console.log('Created session:', sessionId);
      
      // Create WebSockets
      const devWs = new WebSocket(`ws://localhost:${port}/ws`);
      const pmWs = new WebSocket(`ws://localhost:${port}/ws`);
      
      // Track messages
      const pmMessages: any[] = [];
      pmWs.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log('PM received:', msg.type);
        pmMessages.push(msg);
      });
      
      // Wait for connections
      await Promise.all([
        new Promise(resolve => devWs.once('open', resolve)),
        new Promise(resolve => pmWs.once('open', resolve))
      ]);
      
      console.log('WebSockets connected');
      
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
      
      // Wait for registration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Both registered, sending P2P offer from developer');
      
      // Send P2P offer from developer
      devWs.send(JSON.stringify({
        type: 'p2p:offer',
        data: { sdp: 'test-offer-sdp', type: 'offer' }
      }));
      
      // Wait for message relay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('PM messages:', pmMessages.map(m => m.type));
      
      // PM should receive the offer
      const offerMsg = pmMessages.find(m => m.type === 'p2p:offer');
      expect(offerMsg).toBeDefined();
      expect(offerMsg?.data?.sdp).toBe('test-offer-sdp');
      expect(offerMsg?.from).toBe('developer');
      
      // Clean up
      devWs.close();
      pmWs.close();
    } finally {
      wss.close();
      await new Promise<void>(resolve => {
        server.close(() => resolve());
      });
    }
  });
});