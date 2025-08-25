import { Command } from 'commander';
import { createServer } from '@wingman/relay-server';
import type { Server } from 'http';

export const serveCommand = new Command('serve')
  .description('Start the Wingman unified server with optional tunnel')
  .option('-p, --port <number>', 'port to listen on', '8787')
  .option('-h, --host <address>', 'host/address to bind to', 'localhost')
  .option('-t, --tunnel', 'enable automatic tunnel creation on startup')
  .option('--tunnel-port <number>', 'port to tunnel (defaults to server port)')
  .option('--status', 'show server and tunnel status then exit')
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;
    const enableTunnel = options.tunnel || false;
    const tunnelPort = options.tunnelPort ? parseInt(options.tunnelPort, 10) : port;

    // Handle status flag
    if (options.status) {
      try {
        const response = await fetch(`http://${host}:${port}/tunnel/status`);
        if (response.ok) {
          const status = await response.json();
          console.log('🪶 Wingman Server Status');
          console.log('------------------------');
          console.log(`Server: http://${host}:${port}`);
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
      
      // Auto-create tunnel if requested
      if (enableTunnel) {
        console.log(`\n🚀 Creating tunnel for port ${tunnelPort}...`);
        try {
          const response = await fetch(`http://${host}:${port}/tunnel/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              targetPort: tunnelPort, 
              enableP2P: true 
            })
          });
          
          if (response.ok) {
            const tunnel = await response.json();
            console.log(`✅ Tunnel created: ${tunnel.tunnelUrl}`);
            console.log(`   Session ID: ${tunnel.sessionId}`);
            console.log(`   Target: localhost:${tunnel.targetPort}`);
          } else {
            console.error('⚠️  Failed to create tunnel automatically');
          }
        } catch (error) {
          console.error('⚠️  Failed to create tunnel:', error);
        }
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