// P2P WebRTC Client for Wingman Tunnel
(function(window) {
  'use strict';

  // P2P Client Class
  class P2PClient {
    constructor(sessionId, ws) {
      this.sessionId = sessionId;
      this.ws = ws; // WebSocket connection for signaling
      this.peer = null;
      this.isInitiator = false;
      this.isConnected = false;
      this.dataChannel = null;
      this.pendingRequests = new Map();
      this.requestTimeout = 30000; // 30 seconds
      
      // STUN server configuration
      this.rtcConfig = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' }
        ]
      };
      
      // Bind methods
      this.handleSignalingMessage = this.handleSignalingMessage.bind(this);
      this.handleDataChannelMessage = this.handleDataChannelMessage.bind(this);
    }

    /**
     * Initialize P2P connection
     * @param {boolean} initiator - Whether this peer initiates the connection
     */
    async init(initiator = false) {
      this.isInitiator = initiator;
      console.log(`[P2P] Initializing P2P client as ${initiator ? 'initiator' : 'responder'}`);
      
      try {
        // Load SimplePeer if not already loaded
        if (typeof SimplePeer === 'undefined') {
          await this.loadSimplePeer();
        }
        
        // Create peer connection
        this.peer = new SimplePeer({
          initiator: this.isInitiator,
          config: this.rtcConfig,
          trickle: true, // Enable trickle ICE
          channelConfig: {
            label: 'wingman-data',
            ordered: true
          }
        });
        
        // Set up peer event handlers
        this.setupPeerHandlers();
        
        return true;
      } catch (error) {
        console.error('[P2P] Failed to initialize P2P client:', error);
        this.notifyP2PFailed(error.message);
        return false;
      }
    }

    /**
     * Load SimplePeer library dynamically
     */
    async loadSimplePeer() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/simple-peer@9.11.1/simplepeer.min.js';
        script.onload = () => {
          console.log('[P2P] SimplePeer library loaded');
          resolve();
        };
        script.onerror = () => {
          reject(new Error('Failed to load SimplePeer library'));
        };
        document.head.appendChild(script);
      });
    }

    /**
     * Set up peer connection event handlers
     */
    setupPeerHandlers() {
      // Handle signaling data
      this.peer.on('signal', (data) => {
        console.log('[P2P] Signal data:', data.type);
        
        if (data.type === 'offer') {
          this.sendSignalingMessage('p2p:offer', data);
        } else if (data.type === 'answer') {
          this.sendSignalingMessage('p2p:answer', data);
        } else if (data.candidate) {
          this.sendSignalingMessage('p2p:ice-candidate', data);
        }
      });
      
      // Handle connection established
      this.peer.on('connect', () => {
        console.log('[P2P] Peer connection established');
        this.isConnected = true;
        this.notifyP2PReady();
        
        // Get data channel reference
        if (this.peer._channel) {
          this.dataChannel = this.peer._channel;
          this.setupDataChannelHandlers();
        }
      });
      
      // Handle data channel messages
      this.peer.on('data', (data) => {
        this.handleDataChannelMessage(data);
      });
      
      // Handle errors
      this.peer.on('error', (error) => {
        console.error('[P2P] Peer connection error:', error);
        this.notifyP2PFailed(error.message);
        this.cleanup();
      });
      
      // Handle connection close
      this.peer.on('close', () => {
        console.log('[P2P] Peer connection closed');
        this.isConnected = false;
        this.cleanup();
      });
    }

    /**
     * Set up data channel event handlers
     */
    setupDataChannelHandlers() {
      if (!this.dataChannel) return;
      
      this.dataChannel.onopen = () => {
        console.log('[P2P] Data channel opened');
      };
      
      this.dataChannel.onclose = () => {
        console.log('[P2P] Data channel closed');
        this.isConnected = false;
      };
      
      this.dataChannel.onerror = (error) => {
        console.error('[P2P] Data channel error:', error);
      };
    }

    /**
     * Handle incoming signaling messages
     */
    handleSignalingMessage(message) {
      if (!this.peer) {
        console.warn('[P2P] Received signaling message but peer not initialized');
        return;
      }
      
      console.log('[P2P] Handling signaling message:', message.type);
      
      switch (message.type) {
        case 'p2p:initiate':
          // Initialize peer connection
          this.init(message.role === 'pm');
          break;
          
        case 'p2p:offer':
        case 'p2p:answer':
        case 'p2p:ice-candidate':
          // Pass signaling data to peer
          try {
            this.peer.signal(message.data);
          } catch (error) {
            console.error('[P2P] Error processing signal:', error);
          }
          break;
          
        case 'p2p:ready':
          console.log('[P2P] Remote peer ready');
          break;
          
        case 'p2p:failed':
          console.error('[P2P] Remote peer failed:', message.data);
          this.cleanup();
          break;
      }
    }

    /**
     * Send signaling message through WebSocket
     */
    sendSignalingMessage(type, data) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.error('[P2P] WebSocket not available for signaling');
        return;
      }
      
      this.ws.send(JSON.stringify({
        type: type,
        sessionId: this.sessionId,
        data: data
      }));
    }

    /**
     * Handle data channel messages
     */
    handleDataChannelMessage(data) {
      try {
        const message = JSON.parse(data.toString());
        console.log('[P2P] Data channel message:', message.type);
        
        if (message.type === 'http-response') {
          // Handle HTTP response
          const pending = this.pendingRequests.get(message.requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(message.requestId);
            pending.resolve(message.response);
          }
        } else if (message.type === 'http-request') {
          // Handle incoming HTTP request (for PM side)
          this.handleIncomingRequest(message);
        }
      } catch (error) {
        console.error('[P2P] Error handling data channel message:', error);
      }
    }

    /**
     * Send HTTP request through data channel
     */
    async sendRequest(request) {
      if (!this.isConnected || !this.peer) {
        throw new Error('P2P connection not established');
      }
      
      const requestId = Math.random().toString(36).substr(2, 9);
      
      return new Promise((resolve, reject) => {
        // Set timeout
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }, this.requestTimeout);
        
        // Store pending request
        this.pendingRequests.set(requestId, {
          resolve,
          reject,
          timeout
        });
        
        // Send request through data channel
        const message = {
          type: 'http-request',
          requestId: requestId,
          request: request
        };
        
        try {
          this.peer.send(JSON.stringify(message));
        } catch (error) {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          reject(error);
        }
      });
    }

    /**
     * Handle incoming HTTP request (PM side)
     */
    async handleIncomingRequest(message) {
      // This will be handled by the iframe proxy
      // Forward to iframe for processing
      if (window.handleP2PRequest) {
        const response = await window.handleP2PRequest(message.request);
        
        // Send response back through data channel
        this.peer.send(JSON.stringify({
          type: 'http-response',
          requestId: message.requestId,
          response: response
        }));
      }
    }

    /**
     * Notify that P2P is ready
     */
    notifyP2PReady() {
      this.sendSignalingMessage('p2p:ready', {
        sessionId: this.sessionId
      });
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('p2p:ready', {
        detail: { sessionId: this.sessionId }
      }));
    }

    /**
     * Notify that P2P failed
     */
    notifyP2PFailed(reason) {
      this.sendSignalingMessage('p2p:failed', {
        sessionId: this.sessionId,
        reason: reason
      });
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('p2p:failed', {
        detail: { sessionId: this.sessionId, reason: reason }
      }));
    }

    /**
     * Clean up peer connection
     */
    cleanup() {
      if (this.peer) {
        try {
          this.peer.destroy();
        } catch (error) {
          console.error('[P2P] Error destroying peer:', error);
        }
        this.peer = null;
      }
      
      this.isConnected = false;
      this.dataChannel = null;
      
      // Clear pending requests
      for (const [requestId, pending] of this.pendingRequests.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('P2P connection closed'));
      }
      this.pendingRequests.clear();
    }

    /**
     * Check if P2P is connected
     */
    isP2PConnected() {
      return this.isConnected && this.peer && !this.peer.destroyed;
    }

    /**
     * Get connection statistics
     */
    async getStats() {
      if (!this.peer || !this.peer._pc) {
        return null;
      }
      
      try {
        const stats = await this.peer._pc.getStats();
        const report = {};
        
        stats.forEach((stat) => {
          if (stat.type === 'data-channel') {
            report.dataChannel = {
              state: stat.state,
              messagesSent: stat.messagesSent,
              messagesReceived: stat.messagesReceived,
              bytesSent: stat.bytesSent,
              bytesReceived: stat.bytesReceived
            };
          } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
            report.connection = {
              rtt: stat.currentRoundTripTime,
              localCandidate: stat.localCandidateId,
              remoteCandidate: stat.remoteCandidateId
            };
          }
        });
        
        return report;
      } catch (error) {
        console.error('[P2P] Error getting stats:', error);
        return null;
      }
    }
  }

  // Export to window
  window.P2PClient = P2PClient;
  
})(window);