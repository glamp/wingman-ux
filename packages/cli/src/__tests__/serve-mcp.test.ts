import { describe, it, expect, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to wait for server to be ready
async function waitForServer(port: number, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 100));
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
    setTimeout(resolve, 100);
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

  it('should start server without errors and serve MCP endpoint', async () => {
    // Path to CLI binary
    const cliBin = path.resolve(__dirname, '../../dist/index.js');
    
    // Start the server using the actual CLI
    serverProcess = spawn('node', [cliBin, 'serve', '--port', String(testPort)], {
      detached: true, // Create new process group for cleanup
      stdio: 'pipe',
    });

    // Collect output for debugging
    let stdout = '';
    let stderr = '';
    
    serverProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    serverProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Check for immediate errors
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // The process should still be running
    expect(serverProcess.exitCode).toBeNull();
    
    // No error output should contain our specific error
    expect(stderr).not.toContain('mcpServer.addTool is not a function');
    expect(stderr).not.toContain('mcpServer.tool is not a function');
    
    // Wait for server to be ready
    const serverReady = await waitForServer(testPort);
    expect(serverReady).toBe(true);

    // Test that MCP health endpoint works
    const mcpHealthResponse = await fetch(`http://localhost:${testPort}/mcp/health`);
    expect(mcpHealthResponse.ok).toBe(true);
    
    const mcpHealth = await mcpHealthResponse.json();
    expect(mcpHealth).toEqual({
      status: 'healthy',
      name: 'wingman-mcp',
      version: '1.0.0',
      tools: ['wingman_list', 'wingman_review', 'wingman_delete'],
      prompts: ['wingman_fix_ui'],
    });
  }, 10000); // Increase timeout for server startup

  it('should handle MCP tool operations correctly', async () => {
    // Start server
    const cliBin = path.resolve(__dirname, '../../dist/index.js');
    serverProcess = spawn('node', [cliBin, 'serve', '--port', String(testPort)], {
      detached: true,
      stdio: 'pipe',
    });

    // Give server more time to start
    await new Promise(resolve => setTimeout(resolve, 1000));

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

  it('should properly register MCP tools on startup', async () => {
    // This test verifies that the MCP server initializes without throwing errors
    // about missing methods like addTool or tool
    
    const cliBin = path.resolve(__dirname, '../../dist/index.js');
    serverProcess = spawn('node', [cliBin, 'serve', '--port', String(testPort)], {
      detached: true,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';
    
    serverProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    serverProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check that the server started successfully
    expect(stderr).not.toContain('Error starting server');
    expect(stderr).not.toContain('registerTool');
    expect(stderr).not.toContain('TypeError');
    
    // Server should output the standard startup message
    expect(stdout).toContain('Press Ctrl+C to stop the server');

    // Verify the server is actually running
    const healthResponse = await fetch(`http://localhost:${testPort}/health`);
    expect(healthResponse.ok).toBe(true);
  }, 10000);
});