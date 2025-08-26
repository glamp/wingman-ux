import { describe, it, expect, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to wait for server to be ready
async function waitForServer(port: number, maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return false;
}

// Helper to kill process and its children
function killProcess(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (proc.pid) {
      // Kill the process group (negative PID)
      try {
        process.kill(-proc.pid, 'SIGTERM');
      } catch {
        // Process might already be dead
      }
    }
    setTimeout(resolve, 50);
  });
}

describe('wingman serve MCP integration', () => {
  let serverProcess: ChildProcess | null = null;
  const testPort = 9876; // Use a specific test port

  afterEach(async () => {
    // Clean up server process
    if (serverProcess) {
      await killProcess(serverProcess);
      serverProcess = null;
    }
  });

  it('should handle MCP tool operations correctly', async () => {
    // Start server
    const cliBin = path.resolve(__dirname, '../../dist/index.js');
    serverProcess = spawn('node', [cliBin, 'serve', '--port', String(testPort)], {
      detached: true,
      stdio: 'pipe',
    });

    // Give server more time to start
    await new Promise(resolve => setTimeout(resolve, 300));

    // Wait for server
    const serverReady = await waitForServer(testPort);
    expect(serverReady).toBe(true);

    // Create a test annotation
    const testAnnotation = {
      id: 'cli-mcp-test-123',
      createdAt: new Date().toISOString(),
      note: 'Test annotation from CLI MCP test',
      page: {
        url: 'https://example.com/test',
        title: 'Test Page',
        ua: 'Test UA',
        viewport: { w: 1920, h: 1080, dpr: 1 }
      },
      target: {
        mode: 'element',
        selector: '.test-element',
        rect: { x: 100, y: 200, width: 300, height: 400 }
      },
      screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    };

    // Post the annotation
    const postResponse = await fetch(`http://localhost:${testPort}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testAnnotation),
    });
    expect(postResponse.ok).toBe(true);
    
    const postResult = await postResponse.json();
    expect(postResult.id).toBe('cli-mcp-test-123');

    // Verify we can retrieve it via the last endpoint
    const lastResponse = await fetch(`http://localhost:${testPort}/annotations/last`);
    expect(lastResponse.ok).toBe(true);
    
    const lastAnnotation = await lastResponse.json();
    expect(lastAnnotation.id).toBe('cli-mcp-test-123');
  }, 10000);
});