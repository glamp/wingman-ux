// Connection Monitor for P2P and Relay fallback
(function(window) {
  'use strict';

  class ConnectionMonitor {
    constructor(p2pClient, iframeProxy) {
      this.p2pClient = p2pClient;
      this.iframeProxy = iframeProxy;
      this.isMonitoring = false;
      this.healthCheckInterval = null;
      this.fallbackTimeout = null;
      this.connectionMode = 'relay'; // 'p2p' | 'relay' | 'disconnected'
      this.stats = {
        p2pAttempts: 0,
        p2pSuccesses: 0,
        fallbacks: 0,
        totalRequests: 0,
        failedRequests: 0,
        avgLatency: 0
      };
      
      // Configuration
      this.config = {
        healthCheckIntervalMs: 30000, // 30 seconds
        fallbackTimeoutMs: 5000, // 5 seconds to establish P2P
        maxConsecutiveFailures: 3,
        latencyThreshold: 1000 // 1 second
      };
      
      this.consecutiveFailures = 0;
      this.latencyBuffer = [];
      this.maxLatencyBufferSize = 10;
    }

    /**
     * Start monitoring connection
     */
    start() {
      if (this.isMonitoring) return;
      
      this.isMonitoring = true;
      console.log('[ConnectionMonitor] Starting connection monitoring');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start health check interval
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck();
      }, this.config.healthCheckIntervalMs);
      
      // Initial health check
      this.performHealthCheck();
    }

    /**
     * Stop monitoring
     */
    stop() {
      this.isMonitoring = false;
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      if (this.fallbackTimeout) {
        clearTimeout(this.fallbackTimeout);
        this.fallbackTimeout = null;
      }
      
      console.log('[ConnectionMonitor] Stopped connection monitoring');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
      // Listen for P2P events
      window.addEventListener('p2p:ready', (event) => {
        this.handleP2PReady(event);
      });
      
      window.addEventListener('p2p:failed', (event) => {
        this.handleP2PFailed(event);
      });
      
      // Monitor request performance
      if (window.performance && window.PerformanceObserver) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              this.trackRequestLatency(entry.duration);
            }
          }
        });
        
        observer.observe({ entryTypes: ['resource'] });
      }
    }

    /**
     * Perform health check
     */
    async performHealthCheck() {
      console.log('[ConnectionMonitor] Performing health check');
      
      // Check P2P connection
      if (this.p2pClient && this.p2pClient.isP2PConnected()) {
        // P2P is connected, verify it's actually working
        const isHealthy = await this.checkP2PHealth();
        
        if (isHealthy) {
          this.connectionMode = 'p2p';
          this.consecutiveFailures = 0;
          this.updateConnectionStatus('p2p', 'P2P connection healthy');
        } else {
          // P2P unhealthy, trigger fallback
          this.consecutiveFailures++;
          
          if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
            console.log('[ConnectionMonitor] P2P unhealthy, falling back to relay');
            this.triggerFallback();
          }
        }
        
        // Get and display P2P stats
        const stats = await this.p2pClient.getStats();
        if (stats) {
          this.displayStats(stats);
        }
      } else {
        // Not using P2P, check if we should try to establish it
        if (this.shouldAttemptP2P()) {
          this.attemptP2PConnection();
        } else {
          this.connectionMode = 'relay';
          this.updateConnectionStatus('relay', 'Using relay mode');
        }
      }
      
      // Check average latency
      if (this.getAverageLatency() > this.config.latencyThreshold) {
        console.warn('[ConnectionMonitor] High latency detected:', this.getAverageLatency());
        
        // If on P2P with high latency, consider fallback
        if (this.connectionMode === 'p2p') {
          this.consecutiveFailures++;
        }
      }
    }

    /**
     * Check P2P health
     */
    async checkP2PHealth() {
      if (!this.p2pClient || !this.p2pClient.isP2PConnected()) {
        return false;
      }
      
      try {
        // Send a ping through P2P
        const startTime = Date.now();
        const response = await this.p2pClient.sendRequest({
          method: 'GET',
          path: '/health',
          headers: {},
          body: null
        });
        
        const latency = Date.now() - startTime;
        this.trackRequestLatency(latency);
        
        return response && response.status === 200;
      } catch (error) {
        console.error('[ConnectionMonitor] P2P health check failed:', error);
        return false;
      }
    }

    /**
     * Should attempt P2P connection
     */
    shouldAttemptP2P() {
      // Don't attempt if we've had too many failures
      if (this.stats.p2pAttempts > 0 && 
          this.stats.p2pSuccesses === 0 && 
          this.stats.p2pAttempts >= 3) {
        return false;
      }
      
      // Don't attempt if recently failed
      const timeSinceLastAttempt = Date.now() - (this.lastP2PAttempt || 0);
      if (timeSinceLastAttempt < 60000) { // 1 minute cooldown
        return false;
      }
      
      return true;
    }

    /**
     * Attempt P2P connection
     */
    attemptP2PConnection() {
      if (!this.p2pClient) return;
      
      console.log('[ConnectionMonitor] Attempting P2P connection');
      this.stats.p2pAttempts++;
      this.lastP2PAttempt = Date.now();
      
      // Set timeout for P2P establishment
      this.fallbackTimeout = setTimeout(() => {
        if (this.connectionMode !== 'p2p') {
          console.log('[ConnectionMonitor] P2P connection timeout, staying on relay');
          this.stats.fallbacks++;
        }
      }, this.config.fallbackTimeoutMs);
      
      // Trigger P2P initialization
      // This would normally be triggered by the tunnel server
      // but we can request it
      if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({
          type: 'request_p2p',
          sessionId: window.SESSION_DATA?.sessionId
        }));
      }
    }

    /**
     * Handle P2P ready
     */
    handleP2PReady(event) {
      console.log('[ConnectionMonitor] P2P ready');
      
      if (this.fallbackTimeout) {
        clearTimeout(this.fallbackTimeout);
        this.fallbackTimeout = null;
      }
      
      this.connectionMode = 'p2p';
      this.stats.p2pSuccesses++;
      this.consecutiveFailures = 0;
      
      // Enable P2P in iframe proxy
      if (this.iframeProxy) {
        this.iframeProxy.enableP2P();
      }
      
      this.updateConnectionStatus('p2p', 'P2P connection established');
    }

    /**
     * Handle P2P failure
     */
    handleP2PFailed(event) {
      console.log('[ConnectionMonitor] P2P failed:', event.detail);
      
      if (this.fallbackTimeout) {
        clearTimeout(this.fallbackTimeout);
        this.fallbackTimeout = null;
      }
      
      this.triggerFallback();
    }

    /**
     * Trigger fallback to relay
     */
    triggerFallback() {
      console.log('[ConnectionMonitor] Falling back to relay mode');
      
      this.connectionMode = 'relay';
      this.stats.fallbacks++;
      this.consecutiveFailures = 0;
      
      // Disable P2P in iframe proxy
      if (this.iframeProxy) {
        this.iframeProxy.disableP2P();
      }
      
      // Clean up P2P connection
      if (this.p2pClient) {
        this.p2pClient.cleanup();
      }
      
      this.updateConnectionStatus('relay', 'Fell back to relay mode');
    }

    /**
     * Track request latency
     */
    trackRequestLatency(latency) {
      this.latencyBuffer.push(latency);
      
      // Keep buffer size limited
      if (this.latencyBuffer.length > this.maxLatencyBufferSize) {
        this.latencyBuffer.shift();
      }
      
      // Update average
      this.stats.avgLatency = this.getAverageLatency();
    }

    /**
     * Get average latency
     */
    getAverageLatency() {
      if (this.latencyBuffer.length === 0) return 0;
      
      const sum = this.latencyBuffer.reduce((a, b) => a + b, 0);
      return Math.round(sum / this.latencyBuffer.length);
    }

    /**
     * Update connection status UI
     */
    updateConnectionStatus(mode, message) {
      // Update status indicator
      const statusIndicator = document.querySelector('.connection-status');
      if (statusIndicator) {
        statusIndicator.className = `connection-status ${mode}`;
        statusIndicator.textContent = message;
      }
      
      // Update connection type badge
      const typeBadge = document.querySelector('.connection-type');
      if (typeBadge) {
        typeBadge.className = `connection-type ${mode}`;
        typeBadge.textContent = mode.toUpperCase();
      }
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('connection:status', {
        detail: { mode, message }
      }));
    }

    /**
     * Display connection stats
     */
    displayStats(p2pStats) {
      const statsContainer = document.querySelector('.connection-stats');
      if (!statsContainer) return;
      
      const html = `
        <div class="stat-item">
          <span class="stat-label">Mode:</span>
          <span class="stat-value">${this.connectionMode.toUpperCase()}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Latency:</span>
          <span class="stat-value">${this.stats.avgLatency}ms</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">P2P Success:</span>
          <span class="stat-value">${this.stats.p2pSuccesses}/${this.stats.p2pAttempts}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Fallbacks:</span>
          <span class="stat-value">${this.stats.fallbacks}</span>
        </div>
        ${p2pStats ? `
        <div class="stat-item">
          <span class="stat-label">Data Sent:</span>
          <span class="stat-value">${this.formatBytes(p2pStats.dataChannel?.bytesSent || 0)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Data Received:</span>
          <span class="stat-value">${this.formatBytes(p2pStats.dataChannel?.bytesReceived || 0)}</span>
        </div>
        ` : ''}
      `;
      
      statsContainer.innerHTML = html;
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get connection report
     */
    getReport() {
      return {
        mode: this.connectionMode,
        stats: this.stats,
        avgLatency: this.getAverageLatency(),
        isHealthy: this.consecutiveFailures < this.config.maxConsecutiveFailures
      };
    }
  }

  // Export to window
  window.ConnectionMonitor = ConnectionMonitor;
  
})(window);