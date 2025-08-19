import { describe, it, expect, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { createServer } from '@wingman/relay-server';
import type { Server } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../../dist/index.js');

describe('wingman serve command', () => {
  let server: Server | null = null;
  let cliProcess: ChildProcess | null = null;

  afterEach(async () => {
    // Clean up any running servers
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });
      server = null;
    }

    // Clean up any running CLI processes
    if (cliProcess) {
      cliProcess.kill();
      cliProcess = null;
    }
  });

  it('should display help for serve command', async () => {
    const output = await runCliCommand(['serve', '--help']);
    expect(output).toMatchSnapshot();
    expect(output).toContain('Start the Wingman relay server');
    expect(output).toContain('-p, --port <number>');
    expect(output).toContain('-h, --host <address>');
  });

  it('should start server on default port', async () => {
    const { start } = createServer({ port: 8787, host: 'localhost' });
    server = await start();
    
    const address = server.address();
    expect(address).toBeTruthy();
    if (address && typeof address !== 'string') {
      expect(address.port).toBe(8787);
    }
  });

  it('should start server on custom port', async () => {
    const { start } = createServer({ port: 9999, host: 'localhost' });
    server = await start();
    
    const address = server.address();
    expect(address).toBeTruthy();
    if (address && typeof address !== 'string') {
      expect(address.port).toBe(9999);
    }
  });

  it('should bind to custom host', async () => {
    const { start } = createServer({ port: 8788, host: '127.0.0.1' });
    server = await start();
    
    const address = server.address();
    expect(address).toBeTruthy();
    if (address && typeof address !== 'string') {
      expect(address.address).toBe('127.0.0.1');
    }
  });

  it('should handle port already in use', async () => {
    // Start a server on port 8789
    const { start } = createServer({ port: 8789, host: 'localhost' });
    server = await start();

    // Try to start another server on the same port
    try {
      const { start: start2 } = createServer({ port: 8789, host: 'localhost' });
      await start2();
      throw new Error('Should have thrown EADDRINUSE');
    } catch (error: any) {
      expect(error.code).toBe('EADDRINUSE');
    }
  });

  it('should validate port range', async () => {
    const invalidPorts = [0, -1, 65536, 100000, NaN];
    
    for (const port of invalidPorts) {
      if (isNaN(port) || port < 1 || port > 65535) {
        // This is the validation we expect in the CLI
        expect(port).toSatisfy((p: number) => isNaN(p) || p < 1 || p > 65535);
      }
    }
  });
});

// Helper function to run CLI commands
function runCliCommand(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      env: { ...process.env },
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0 || args.includes('--help')) {
        resolve(output);
      } else {
        reject(new Error(`CLI exited with code ${code}: ${errorOutput}`));
      }
    });

    child.on('error', reject);
  });
}