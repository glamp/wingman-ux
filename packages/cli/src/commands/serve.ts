import { Command } from 'commander';
import { createServer } from '@wingman/wingman-api';
import type { Server } from 'http';
import WebSocket from 'ws';
import * as http from 'http';

// Global variables to track tunnel connection
let tunnelWs: WebSocket | null = null;
let currentSessionId: string | null = null;

async function createTunnelWithWebSocket(apiHost: string, apiPort: number, secure: boolean, tunnelPort: number): Promise<void> {
  console.log(`\n🚀 Creating tunnel for port ${tunnelPort}...`);
  
  const protocol = secure ? 'https' : 'http';
  const wsProtocol = secure ? 'wss' : 'ws';
  
  try {
    // Step 1: Create tunnel session
    const createUrl = `${protocol}://${apiHost}:${apiPort}/tunnel/create`;
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        targetPort: tunnelPort, 
        enableP2P: false  // Start with relay mode
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create tunnel: ${error}`);
    }
    
    const tunnel = await response.json();
    currentSessionId = tunnel.sessionId;
    
    console.log(`✅ Tunnel session created: ${tunnel.tunnelUrl}`);
    console.log(`   Session ID: ${tunnel.sessionId}`);
    console.log(`   Target: localhost:${tunnel.targetPort}`);
    
    // Step 2: Connect via WebSocket and register as developer
    console.log('\n🔌 Connecting to tunnel server...');
    
    const wsUrl = `${wsProtocol}://${apiHost}:${apiPort}/ws`;
    tunnelWs = new WebSocket(wsUrl);
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);
      
      tunnelWs!.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ WebSocket connected');
        
        // Register as developer
        console.log('🔐 Registering as developer...');
        tunnelWs!.send(JSON.stringify({
          type: 'register',
          role: 'developer',
          sessionId: currentSessionId
        }));
      });
      
      tunnelWs!.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'registered' && message.role === 'developer') {
            console.log('✅ Registered as developer!');
            console.log(`🌐 Tunnel is active and ready: ${tunnel.tunnelUrl}`);
            resolve();
          } else if (message.type === 'error') {
            reject(new Error(message.error));
          } else if (message.type === 'request') {
            // Handle incoming tunnel requests
            handleTunnelRequest(message, tunnelPort);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      });
      
      tunnelWs!.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error.message}`));
      });
      
      tunnelWs!.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        // TODO: Implement reconnection logic
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to create tunnel:', error);
    throw error;
  }
}

async function handleTunnelRequest(message: any, tunnelPort: number): Promise<void> {
  const { requestId, request } = message;
  
  try {
    // Forward request to localhost
    const { method, path, headers, body } = request;
    const url = `http://localhost:${tunnelPort}${path}`;
    
    console.log(`🔄 Forwarding ${method} ${path} to localhost:${tunnelPort}`);
    
    const response = await fetch(url, {
      method,
      headers: headers || {},
      body: body ? Buffer.from(body, 'base64') : undefined
    });
    
    const responseBody = await response.arrayBuffer();
    
    // Send response back through WebSocket
    if (tunnelWs && tunnelWs.readyState === WebSocket.OPEN) {
      tunnelWs.send(JSON.stringify({
        type: 'response',
        requestId,
        response: {
          statusCode: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: Buffer.from(responseBody).toString('base64')
        }
      }));
    }
    
  } catch (error) {
    console.error('❌ Error forwarding request:', error);
    
    // Send error response back
    if (tunnelWs && tunnelWs.readyState === WebSocket.OPEN) {
      tunnelWs.send(JSON.stringify({
        type: 'response',
        requestId,
        response: {
          statusCode: 500,
          statusText: 'Internal Server Error',
          headers: { 'content-type': 'text/plain' },
          body: Buffer.from('Internal Server Error').toString('base64')
        }
      }));
    }
  }
}

export const serveCommand = new Command('serve')
  .description('Start the Wingman unified server with automatic tunnel')
  .option('-p, --port <number>', 'port to listen on', '8787')
  .option('-h, --host <address>', 'host/address to bind to', 'localhost')
  .option('--tunnel-port <number>', 'port to tunnel (defaults to server port)')
  .option('--api-host <address>', 'tunnel API server host', 'api.wingmanux.com')
  .option('--api-port <number>', 'tunnel API server port (defaults to 443 for secure, 80 for insecure)')
  .option('--local', 'use local API server instead of remote (disables tunnel)')
  .option('--no-tunnel', 'disable tunnel creation (local server only)')
  .option('--insecure', 'use HTTP instead of HTTPS for API connections')
  .option('--status', 'show server and tunnel status then exit')
  .addHelpText('after', `

Examples:
  $ wingman serve --tunnel-port 3000
    Create secure tunnel to api.wingmanux.com, forward to localhost:3000

  $ wingman serve --local --tunnel-port 3000  
    Local development only, no tunnel (localhost:8787)

  $ wingman serve --no-tunnel --port 8080
    Local server on port 8080, no tunnel

  $ wingman serve --insecure --api-host custom.example.com
    Use custom API server with HTTP instead of HTTPS

  $ wingman serve --status
    Show current tunnel status and exit
`)
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;
    const tunnelPort = options.tunnelPort ? parseInt(options.tunnelPort, 10) : port;
    
    // Determine if we're using local or remote mode
    const useLocal = options.local || false;
    const tunnelDisabled = options.tunnel === false; // --no-tunnel sets tunnel: false
    
    // Set defaults based on local vs remote mode
    const apiHost = useLocal ? host : (options.apiHost || 'api.wingmanux.com');
    const secure = useLocal ? false : !options.insecure;
    const enableTunnel = useLocal ? false : !tunnelDisabled;
    
    // Calculate API port based on mode and security
    const apiPort = options.apiPort ? 
      parseInt(options.apiPort, 10) : 
      (useLocal ? port : (secure ? 443 : 80));

    // Validate conflicting options
    if (useLocal && options.apiHost && options.apiHost !== 'api.wingmanux.com') {
      console.error('Error: --local cannot be used with custom --api-host');
      process.exit(1);
    }
    
    if (useLocal && options.insecure) {
      console.error('Error: --local already uses insecure connections, --insecure flag is redundant');
      process.exit(1);
    }

    // Handle status flag
    if (options.status) {
      try {
        const protocol = secure ? 'https' : 'http';
        const statusUrl = `${protocol}://${apiHost}:${apiPort}/tunnel/status`;
        const response = await fetch(statusUrl);
        if (response.ok) {
          const status = await response.json();
          console.log('🪶 Wingman Server Status');
          console.log('------------------------');
          console.log(`API Server: ${protocol}://${apiHost}:${apiPort}`);
          console.log(`Tunnels: ${status.tunnels.length} active`);
          if (status.tunnels.length > 0) {
            console.log('\nActive Tunnels:');
            status.tunnels.forEach((tunnel: any) => {
              console.log(`  - ${tunnel.sessionId}: ${tunnel.tunnelUrl} → localhost:${tunnel.targetPort}`);
            });
          }
        } else {
          console.error('Error: Server not responding. Is it running?');
        }
      } catch (error) {
        console.error('Error: Could not connect to server. Is it running?');
      }
      process.exit(0);
    }

    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('Error: Invalid port number. Must be between 1 and 65535.');
      process.exit(1);
    }

    if (tunnelPort && (isNaN(tunnelPort) || tunnelPort < 1 || tunnelPort > 65535)) {
      console.error('Error: Invalid tunnel port number. Must be between 1 and 65535.');
      process.exit(1);
    }

    let server: Server | null = null;

    // Graceful shutdown handler
    const shutdown = async () => {
      console.log('\nShutting down server...');
      
      // Close tunnel WebSocket if open
      if (tunnelWs && tunnelWs.readyState === WebSocket.OPEN) {
        console.log('🔌 Closing tunnel connection...');
        tunnelWs.close();
      }
      
      if (server) {
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    // Handle signals
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    try {
      const { start, sessionManager } = createServer({ 
        port, 
        host, 
        enableTunnel, 
        tunnelPort 
      });
      server = await start();
      
      // Display mode information
      if (useLocal) {
        console.log('\n🏠 Local Development Mode');
        console.log('──────────────────────────');
        console.log(`Local server: http://${host}:${port}`);
        console.log('No tunnel created - for local development only');
      } else if (enableTunnel) {
        console.log('\n🌐 Remote Tunnel Mode');
        console.log('───────────────────────');
        console.log(`Local server: http://${host}:${port}`);
        await createTunnelWithWebSocket(apiHost, apiPort, secure, tunnelPort);
      } else {
        console.log('\n📡 Local Server Only');
        console.log('──────────────────────');
        console.log(`Local server: http://${host}:${port}`);
        console.log('Tunnel disabled with --no-tunnel');
      }
      
      console.log('\nPress Ctrl+C to stop the server');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('EADDRINUSE')) {
          console.error(`Error: Port ${port} is already in use.`);
        } else if (error.message.includes('EADDRNOTAVAIL')) {
          console.error(`Error: Cannot bind to host '${host}'. Address not available.`);
        } else {
          console.error('Error starting server:', error.message);
        }
      } else {
        console.error('Error starting server:', error);
      }
      process.exit(1);
    }
  });