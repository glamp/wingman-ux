import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../../dist/index.js');

describe('wingman CLI', () => {
  it('should display version', async () => {
    const output = await runCliCommand(['--version']);
    expect(output.trim()).toBe('1.0.0');
  });

  it('should display help', async () => {
    const output = await runCliCommand(['--help']);
    expect(output).toMatchSnapshot();
    expect(output).toContain('CLI for Wingman');
    expect(output).toContain('serve [options]');
    expect(output).toContain('Start the Wingman relay server');
  });

  it('should show error for unknown command', async () => {
    try {
      await runCliCommand(['unknown-command']);
      throw new Error('Should have failed');
    } catch (error: any) {
      expect(error.message).toContain("error: unknown command 'unknown-command'");
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
      if (code === 0 || args.includes('--help') || args.includes('--version')) {
        resolve(output || errorOutput); // Some messages go to stderr
      } else {
        reject(new Error(errorOutput || `CLI exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}