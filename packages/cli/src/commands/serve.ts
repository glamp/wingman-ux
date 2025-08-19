import { Command } from 'commander';
import { createServer } from '@wingman/relay-server';
import type { Server } from 'http';

export const serveCommand = new Command('serve')
  .description('Start the Wingman relay server')
  .option('-p, --port <number>', 'port to listen on', '8787')
  .option('-h, --host <address>', 'host/address to bind to', 'localhost')
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;

    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('Error: Invalid port number. Must be between 1 and 65535.');
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
      const { start } = createServer({ port, host });
      server = await start();
      
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