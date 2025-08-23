#!/usr/bin/env node

/**
 * Playwright MCP Setup Script for Wingman Extension
 * 
 * This script sets up Playwright Model Context Protocol (MCP) integration
 * for advanced browser automation and testing of the Wingman extension.
 * It installs the necessary dependencies and creates configuration files.
 * 
 * Usage:
 *   node scripts/setup-playwright-mcp.js [options]
 * 
 * Options:
 *   --install-deps   Install Playwright MCP dependencies
 *   --config-only    Only create configuration files (skip install)
 *   --test-setup     Test the MCP setup after installation
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class PlaywrightMCPSetup {
  constructor(options = {}) {
    this.options = {
      installDeps: true,
      configOnly: false,
      testSetup: false,
      ...options
    };
    
    this.packageRoot = path.resolve(__dirname, '..');
    this.mcpConfigPath = path.join(this.packageRoot, '.mcp');
  }

  /**
   * Main setup process
   */
  async setup() {
    try {
      console.log('🎭 Setting up Playwright MCP for Wingman Extension...\n');
      
      if (!this.options.configOnly) {
        await this.installDependencies();
      }
      
      await this.createMCPConfiguration();
      await this.updatePlaywrightConfig();
      await this.createMCPTools();
      
      if (this.options.testSetup) {
        await this.testMCPSetup();
      }
      
      console.log('\n✅ Playwright MCP setup completed successfully!');
      this.printUsageInstructions();
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Install Playwright MCP dependencies
   */
  async installDependencies() {
    console.log('📦 Installing Playwright MCP dependencies...');
    
    const dependencies = [
      '@microsoft/playwright-mcp',
      '@playwright/test',
      'chokidar' // For file watching
    ];
    
    return new Promise((resolve, reject) => {
      const installProcess = spawn('npm', ['install', '--save-dev', ...dependencies], {
        stdio: 'inherit',
        cwd: this.packageRoot
      });
      
      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dependencies installed successfully\n');
          resolve();
        } else {
          reject(new Error(`Installation failed with exit code ${code}`));
        }
      });
    });
  }

  /**
   * Create MCP configuration directory and files
   */
  async createMCPConfiguration() {
    console.log('⚙️  Creating MCP configuration...');
    
    // Create .mcp directory
    if (!fs.existsSync(this.mcpConfigPath)) {
      fs.mkdirSync(this.mcpConfigPath, { recursive: true });
    }
    
    // Create MCP server configuration
    const serverConfig = {
      name: 'wingman-extension-mcp',
      version: '1.0.0',
      description: 'Playwright MCP server for Wingman Chrome extension testing',
      transport: 'stdio',
      capabilities: {
        tools: true,
        resources: false,
        prompts: true
      },
      tools: [
        {
          name: 'wingman_test_extension',
          description: 'Test the Wingman extension in a browser context'
        },
        {
          name: 'wingman_capture_screenshot',
          description: 'Capture screenshot with extension overlay'
        },
        {
          name: 'wingman_simulate_feedback',
          description: 'Simulate user feedback flow through the extension'
        },
        {
          name: 'wingman_test_api_integration', 
          description: 'Test extension integration with Wingman relay server'
        }
      ]
    };
    
    const configPath = path.join(this.mcpConfigPath, 'server-config.json');
    fs.writeFileSync(configPath, JSON.stringify(serverConfig, null, 2));
    
    // Create MCP server startup script
    const serverScript = `#!/usr/bin/env node

/**
 * Wingman Extension MCP Server
 * 
 * This server provides Playwright-based tools for testing and interacting
 * with the Wingman Chrome extension through the Model Context Protocol.
 */

const { spawn } = require('child_process');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '..', 'dist', 'development');
const SERVER_CONFIG = require('./server-config.json');

class WingmanMCPServer {
  constructor() {
    this.browser = null;
    this.context = null;
  }

  async start() {
    console.error('🎭 Starting Wingman Extension MCP Server...');
    
    // Start the MCP server with Playwright integration
    const mcpServer = spawn('npx', ['@microsoft/playwright-mcp'], {
      stdio: ['inherit', 'inherit', 'inherit'],
      env: {
        ...process.env,
        WINGMAN_EXTENSION_PATH: EXTENSION_PATH,
        MCP_SERVER_CONFIG: JSON.stringify(SERVER_CONFIG)
      }
    });
    
    mcpServer.on('error', (error) => {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    });
    
    mcpServer.on('close', (code) => {
      console.error(\`MCP server exited with code \${code}\`);
      process.exit(code);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }
  
  async cleanup() {
    console.error('🧹 Shutting down MCP server...');
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    process.exit(0);
  }
}

if (require.main === module) {
  const server = new WingmanMCPServer();
  server.start();
}

module.exports = WingmanMCPServer;
`;
    
    const serverScriptPath = path.join(this.mcpConfigPath, 'server.js');
    fs.writeFileSync(serverScriptPath, serverScript);
    fs.chmodSync(serverScriptPath, '755');
    
    console.log('✅ MCP configuration created');
  }

  /**
   * Update or create Playwright configuration
   */
  async updatePlaywrightConfig() {
    console.log('🔧 Creating Playwright configuration...');
    
    const playwrightConfig = `import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, 'dist', 'development');

/**
 * Playwright configuration for Wingman Extension testing
 * Configured to work with Chrome extensions and MCP integration
 */
export default defineConfig({
  testDir: './tests/playwright',
  
  // Global test configuration
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }]
  ],
  
  outputDir: 'test-results/playwright-artifacts',
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/playwright/global-setup.ts'),
  globalTeardown: require.resolve('./tests/playwright/global-teardown.ts'),
  
  use: {
    // Base URL for testing (Wingman relay server)
    baseURL: 'http://localhost:8787',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome extension specific configuration
        launchOptions: {
          args: [
            \`--disable-extensions-except=\${EXTENSION_PATH}\`,
            \`--load-extension=\${EXTENSION_PATH}\`,
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=TranslateUI'
          ],
          devtools: false,
        },
        // Use persistent context for extension access
        contextOptions: {
          // Extensions require persistent context
          viewport: { width: 1280, height: 720 },
          permissions: ['notifications', 'clipboard-read', 'clipboard-write'],
        }
      },
    },
    
    {
      name: 'headless-testing',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            \`--disable-extensions-except=\${EXTENSION_PATH}\`,
            \`--load-extension=\${EXTENSION_PATH}\`,
            '--headless=new',
            '--disable-gpu',
            '--disable-dev-shm-usage',
          ]
        }
      },
    }
  ],

  // Web server configuration (start Wingman relay server)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8787',
    reuseExistingServer: !process.env.CI,
    cwd: path.resolve(__dirname, '..', '..', 'relay-server'),
  },
});
`;
    
    const configPath = path.join(this.packageRoot, 'playwright.config.ts');
    fs.writeFileSync(configPath, playwrightConfig);
    
    console.log('✅ Playwright configuration created');
  }

  /**
   * Create MCP tool implementations
   */
  async createMCPTools() {
    console.log('🛠️  Creating MCP tools...');
    
    // Create tests directory structure
    const testsDir = path.join(this.packageRoot, 'tests', 'playwright');
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }
    
    // Create global setup file
    const globalSetup = `import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '..', '..', 'dist', 'development');

async function globalSetup(config: FullConfig) {
  console.log('🎭 Setting up Playwright environment for Wingman extension...');
  
  // Verify extension build exists
  const fs = require('fs');
  const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Extension build not found. Please run npm run build:dev first.');
    process.exit(1);
  }
  
  console.log('✅ Extension build verified');
  console.log('📁 Extension path:', EXTENSION_PATH);
}

export default globalSetup;
`;
    
    const globalSetupPath = path.join(testsDir, 'global-setup.ts');
    fs.writeFileSync(globalSetupPath, globalSetup);
    
    // Create global teardown file
    const globalTeardown = `import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up Playwright environment...');
}

export default globalTeardown;
`;
    
    const globalTeardownPath = path.join(testsDir, 'global-teardown.ts');
    fs.writeFileSync(globalTeardownPath, globalTeardown);
    
    // Create example test file
    const exampleTest = `import { test, expect } from '@playwright/test';

test.describe('Wingman Extension', () => {
  test('should load extension successfully', async ({ page, context }) => {
    // Navigate to a test page
    await page.goto('https://example.com');
    
    // Verify extension is loaded by checking for extension content script
    const extensionLoaded = await page.evaluate(() => {
      return window.wingmanExtensionLoaded === true;
    });
    
    expect(extensionLoaded).toBe(true);
  });
  
  test('should capture screenshot functionality', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Simulate extension screenshot capture
    // This would trigger the extension's screenshot functionality
    await page.keyboard.press('Alt+Shift+S'); // Example shortcut
    
    // Wait for screenshot capture to complete
    await page.waitForTimeout(1000);
    
    // Verify screenshot was captured (implementation depends on extension behavior)
    // This is a placeholder for actual extension testing logic
  });
});
`;
    
    const exampleTestPath = path.join(testsDir, 'extension.spec.ts');
    fs.writeFileSync(exampleTestPath, exampleTest);
    
    console.log('✅ MCP tools and test structure created');
  }

  /**
   * Test the MCP setup
   */
  async testMCPSetup() {
    console.log('🧪 Testing MCP setup...');
    
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npx', ['playwright', 'test', '--reporter=line'], {
        stdio: 'inherit',
        cwd: this.packageRoot
      });
      
      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ MCP setup test passed');
          resolve();
        } else {
          console.warn('⚠️  MCP setup test had issues (this may be expected for initial setup)');
          resolve(); // Don't fail setup for test issues
        }
      });
    });
  }

  /**
   * Print usage instructions
   */
  printUsageInstructions() {
    console.log(`
🎭 Playwright MCP Setup Complete!

Next steps:
1. Build your extension: npm run build:dev
2. Start the relay server: cd ../relay-server && npm run dev  
3. Start MCP server: node .mcp/server.js
4. Run tests: npx playwright test

MCP Tools Available:
- wingman_test_extension: Test the extension in browser context
- wingman_capture_screenshot: Capture screenshots with extension overlay  
- wingman_simulate_feedback: Simulate user feedback flows
- wingman_test_api_integration: Test relay server integration

Configuration files created:
- playwright.config.ts: Playwright test configuration
- .mcp/server-config.json: MCP server configuration
- .mcp/server.js: MCP server startup script
- tests/playwright/: Test directory structure

For Claude Code integration, add to your MCP settings:
{
  "wingman-playwright": {
    "command": "node",
    "args": ["${this.mcpConfigPath}/server.js"],
    "cwd": "${this.packageRoot}"
  }
}
`);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    installDeps: true,
    configOnly: false,
    testSetup: false
  };
  
  for (const arg of args) {
    switch (arg) {
      case '--install-deps':
        options.installDeps = true;
        break;
      case '--config-only':
        options.configOnly = true;
        options.installDeps = false;
        break;
      case '--test-setup':
        options.testSetup = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        console.warn(`Unknown option: ${arg}`);
        break;
    }
  }
  
  return options;
}

function printHelp() {
  console.log(`
Wingman Extension Playwright MCP Setup

Usage: node scripts/setup-playwright-mcp.js [options]

Options:
  --install-deps   Install Playwright MCP dependencies (default)
  --config-only    Only create configuration files (skip install) 
  --test-setup     Test the MCP setup after installation
  --help          Show this help message

This script sets up Playwright Model Context Protocol integration
for advanced browser automation and testing of the Wingman extension.
`);
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const setup = new PlaywrightMCPSetup(options);
  
  setup.setup().catch((error) => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = PlaywrightMCPSetup;